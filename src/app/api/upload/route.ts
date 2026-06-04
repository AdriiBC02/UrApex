import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleUpload, processImport } from "@/server/services/import.service"
import { MAX_UPLOAD_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/constants"

async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1. Try bearer token (companion app)
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]
  if (bearer) {
    const { db } = await import("@/lib/db")
    const user = await db.user.findUnique({ where: { apiKey: bearer }, select: { id: true } })
    return user?.id ?? null
  }
  // 2. Fall back to session cookie (browser)
  const session = await auth()
  return session?.user?.id ?? null
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const files = formData.getAll("files") as File[]
  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 422 })
  }

  // Check if user has a driver name configured
  const { db } = await import("@/lib/db")
  const profile = await db.driverProfile.findUnique({
    where: { userId },
    select: { simDriverName: true },
  })
  const hasDriverName = Boolean(profile?.simDriverName)

  const results = []
  const allDriverNames = new Set<string>()

  for (const file of files) {
    const isXml =
      ALLOWED_MIME_TYPES.includes(file.type) ||
      file.name.toLowerCase().endsWith(".xml")
    if (!isXml) {
      results.push({
        originalName: file.name,
        status: "FAILED",
        isDuplicate: false,
        error: "Only XML files are supported",
      })
      continue
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      results.push({
        originalName: file.name,
        status: "FAILED",
        isDuplicate: false,
        error: `File exceeds ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB limit`,
      })
      continue
    }

    try {
      const uploadResult = await handleUpload(userId, file)

      if (uploadResult.isDuplicate) {
        results.push(uploadResult)
        continue
      }

      // Collect driver names from this file
      for (const name of uploadResult.driverNames ?? []) {
        allDriverNames.add(name)
      }

      if (hasDriverName) {
        // Process immediately — driver name fetched from DB inside processImport
        await processImport(uploadResult.importFileId)

        const updated = await db.importFile.findUnique({
          where: { id: uploadResult.importFileId },
          include: { session: { select: { id: true } } },
        })

        results.push({
          importFileId: uploadResult.importFileId,
          originalName: file.name,
          status: updated?.status ?? "IMPORTED",
          isDuplicate: false,
          sessionId: updated?.session?.id,
          errorMessage: updated?.errorMessage,
        })
      } else {
        // Defer processing until driver name is selected
        results.push({
          importFileId: uploadResult.importFileId,
          originalName: file.name,
          status: "PENDING",
          isDuplicate: false,
          deferred: true,
        })
      }
    } catch (err) {
      results.push({
        originalName: file.name,
        status: "FAILED",
        isDuplicate: false,
        error: err instanceof Error ? err.message : "Import failed",
      })
    }
  }

  if (!hasDriverName && results.some((r) => (r as { deferred?: boolean }).deferred)) {
    return NextResponse.json({
      needsDriverSelection: true,
      driverNames: [...allDriverNames].sort(),
      imports: results,
    })
  }

  return NextResponse.json({ imports: results })
}
