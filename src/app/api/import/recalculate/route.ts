import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getRecalculateQueue } from "@/server/queue/recalculate.queue"

// POST /api/import/recalculate — enqueue a full metric recalculation for the current user
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await getRecalculateQueue().add("recalculate", { userId: session.user.id })

  return NextResponse.json({ queued: true })
}
