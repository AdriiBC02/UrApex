import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { randomBytes } from "crypto"
import { z } from "zod"

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 422 })

  const { email } = parsed.data

  // Always return 200 — never confirm whether an email exists (prevents enumeration)
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ sent: true })

  // Invalidate any previous unused tokens for this user
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

  const token     = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  await sendPasswordResetEmail(email, resetUrl)

  return NextResponse.json({ sent: true })
}
