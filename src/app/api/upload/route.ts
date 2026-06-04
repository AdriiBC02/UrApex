import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { handleUpload, processImport } from "@/server/services/import.service"
import { MAX_UPLOAD_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

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

  const results = []

  for (const file of files) {
    // Validate type
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

    // Validate size
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

      // Run import synchronously (Phase 1 — BullMQ in Phase 2)
      await processImport(uploadResult.importFileId)

      // Fetch updated status
      const { db } = await import("@/lib/db")
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
    } catch (err) {
      results.push({
        originalName: file.name,
        status: "FAILED",
        isDuplicate: false,
        error: err instanceof Error ? err.message : "Import failed",
      })
    }
  }

  return NextResponse.json({ imports: results })
}
