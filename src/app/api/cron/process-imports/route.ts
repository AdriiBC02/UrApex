import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { processImport } from "@/server/services/import.service"

// Called every minute by Vercel Cron (vercel.json).
// On persistent runtimes (local dev, Railway) the BullMQ worker handles this
// instead and this endpoint is never reached — it's a serverless-only fallback.
export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pending = await db.importFile.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true },
  })

  const results = await Promise.allSettled(
    pending.map((f) => processImport(f.id))
  )

  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed    = results.filter((r) => r.status === "rejected").length

  return NextResponse.json({ processed: pending.length, succeeded, failed })
}
