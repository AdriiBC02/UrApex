import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { randomBytes } from "crypto"

// GET — fetch current API key status (masked)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true },
  })

  return NextResponse.json({
    hasKey: Boolean(user?.apiKey),
    // Return last 8 chars only so the user can verify it matches their companion app
    preview: user?.apiKey ? `...${user.apiKey.slice(-8)}` : null,
  })
}

// POST — generate (or regenerate) API key
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = `uapx_${randomBytes(32).toString("hex")}`

  await db.user.update({
    where: { id: session.user.id },
    data: { apiKey },
  })

  // Return the full key only once — user must copy it now
  return NextResponse.json({ apiKey })
}

// DELETE — revoke API key
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.user.update({
    where: { id: session.user.id },
    data: { apiKey: null },
  })

  return NextResponse.json({ revoked: true })
}
