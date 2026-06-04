import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

async function getOwnedGoal(goalId: string, userId: string) {
  return db.goal.findFirst({ where: { id: goalId, userId } })
}

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
  name: z.string().min(1).max(120).optional(),
  targetValue: z.number().positive().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const goal = await getOwnedGoal(id, session.user.id)
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 })
  }

  const { status, name, targetValue, deadline } = parsed.data

  const updated = await db.goal.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(targetValue !== undefined && { targetValue }),
      ...(deadline !== undefined && {
        deadline: deadline ? new Date(`${deadline}T00:00:00.000Z`) : null,
      }),
      ...(status !== undefined && {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      }),
    },
    select: { id: true, name: true, status: true, completedAt: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const goal = await getOwnedGoal(id, session.user.id)
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.goal.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
