import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processImport } from "@/server/services/import.service"
import { z } from "zod"

const schema = z.object({
  importFileIds: z.array(z.string()).min(1),
  driverName: z.string().min(1).max(128),
})

// POST /api/import/process — complete deferred imports after driver selection
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 })

  const { importFileIds, driverName } = parsed.data

  // Store the driver name in the user's profile (upsert — profile should already exist)
  await db.driverProfile.update({
    where: { userId },
    data: { simDriverName: driverName },
  })

  const results = []

  for (const importFileId of importFileIds) {
    const importFile = await db.importFile.findUnique({ where: { id: importFileId } })

    if (!importFile || importFile.userId !== userId) {
      results.push({ importFileId, status: "FAILED", error: "Not found" })
      continue
    }

    // Reset status so processImport can run
    await db.importFile.update({
      where: { id: importFileId },
      data: { status: "PENDING", errorMessage: null, errorDetails: undefined },
    })

    try {
      await processImport(importFileId)

      const updated = await db.importFile.findUnique({
        where: { id: importFileId },
        include: { session: { select: { id: true } } },
      })

      results.push({
        importFileId,
        originalName: importFile.originalName,
        status: updated?.status ?? "IMPORTED",
        isDuplicate: false,
        sessionId: updated?.session?.id,
        errorMessage: updated?.errorMessage,
      })
    } catch (err) {
      results.push({
        importFileId,
        originalName: importFile.originalName,
        status: "FAILED",
        error: err instanceof Error ? err.message : "Import failed",
      })
    }
  }

  return NextResponse.json({ imports: results })
}
