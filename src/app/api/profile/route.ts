import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const schema = z.object({
  displayName: z.string().max(64).optional(),
  country: z.string().max(2).optional(),
  bio: z.string().max(300).optional(),
  simDriverName: z.string().max(128).optional().nullable(),
  onboardingDone: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 })

  const { displayName, country, bio, simDriverName, onboardingDone } = parsed.data

  await db.driverProfile.update({
    where: { userId: session.user.id },
    data: {
      displayName,
      country: country || null,
      bio: bio || null,
      ...(simDriverName !== undefined ? { simDriverName: simDriverName || null } : {}),
      ...(onboardingDone !== undefined ? { onboardingDone } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await db.driverProfile.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json(profile)
}
