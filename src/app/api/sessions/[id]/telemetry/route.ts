import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const sampleSchema = z.object({
  t_ms:      z.number(),
  lap:       z.number().int(),
  speed_kph: z.number().optional(),
  rpm:       z.number().optional(),
  gear:      z.number().int().optional(),
  throttle:  z.number().optional(),
  brake:     z.number().optional(),
  steering:  z.number().optional(),
  fuel_l:    z.number().optional(),
  tire_fl_temp: z.number().optional(), tire_fr_temp: z.number().optional(),
  tire_rl_temp: z.number().optional(), tire_rr_temp: z.number().optional(),
  tire_fl_wear: z.number().optional(), tire_fr_wear: z.number().optional(),
  tire_rl_wear: z.number().optional(), tire_rr_wear: z.number().optional(),
  tire_fl_pres: z.number().optional(), tire_fr_pres: z.number().optional(),
  tire_rl_pres: z.number().optional(), tire_rr_pres: z.number().optional(),
  brk_fl_temp: z.number().optional(), brk_fr_temp: z.number().optional(),
  brk_rl_temp: z.number().optional(), brk_rr_temp: z.number().optional(),
  oil_temp:  z.number().optional(),
  h2o_temp:  z.number().optional(),
  game_phase: z.number().int().optional(),
  flag:       z.number().int().optional(),
})

const bodySchema = z.object({
  frames:   z.array(sampleSchema),
  sampleHz: z.number().optional().default(10),
})

// POST /api/sessions/[id]/telemetry
// Accepts companion Bearer API key or session cookie.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: session cookie or Bearer API key
  const { id } = await params
  let userId: string | undefined

  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const key  = authHeader.slice(7)
    const user = await db.user.findUnique({ where: { apiKey: key }, select: { id: true } })
    userId = user?.id
  } else {
    const session = await auth()
    userId = session?.user?.id ?? undefined
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const gameSession = await db.session.findUnique({
    where:  { id, deletedAt: null },
    select: { id: true, userId: true },
  })
  if (!gameSession || gameSession.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const raw    = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", detail: parsed.error.flatten() }, { status: 422 })
  }

  const { frames, sampleHz } = parsed.data
  const durationSec = frames.length > 0
    ? Math.round((frames[frames.length - 1].t_ms - frames[0].t_ms) / 1000)
    : null

  const recording = await db.telemetryRecording.upsert({
    where:  { sessionId: id },
    create: { sessionId: id, frames, totalFrames: frames.length, sampleHz, durationSec },
    update: { frames, totalFrames: frames.length, sampleHz, durationSec, uploadedAt: new Date() },
  })

  return NextResponse.json({ id: recording.id, totalFrames: frames.length })
}

// GET /api/sessions/[id]/telemetry
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const gameSession = await db.session.findUnique({
    where:  { id, deletedAt: null },
    select: { id: true, userId: true },
  })
  if (!gameSession || gameSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const recording = await db.telemetryRecording.findUnique({
    where:  { sessionId: id },
    select: { id: true, totalFrames: true, sampleHz: true, durationSec: true, uploadedAt: true, frames: true },
  })

  if (!recording) return NextResponse.json({ error: "No recording" }, { status: 404 })
  return NextResponse.json(recording)
}
