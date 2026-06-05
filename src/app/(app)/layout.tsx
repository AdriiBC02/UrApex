import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AppShell } from "@/components/layout/AppShell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [profile, recentSessions] = await Promise.all([
    db.driverProfile.findUnique({
      where:  { userId: session.user.id },
      select: { onboardingDone: true },
    }),
    db.session.findMany({
      where:   { userId: session.user.id, deletedAt: null },
      orderBy: { sessionDate: "desc" },
      take:    8,
      select: {
        id:          true,
        sessionType: true,
        sessionDate: true,
        track: { select: { name: true } },
        car:   { select: { name: true } },
      },
    }),
  ])

  if (profile && !profile.onboardingDone) redirect("/onboarding")

  return (
    <AppShell
      user={session.user}
      recentSessions={recentSessions.map((s) => ({
        id:          s.id,
        sessionType: s.sessionType,
        sessionDate: s.sessionDate.toISOString(),
        trackName:   s.track.name,
        carName:     s.car.name,
      }))}
    >
      {children}
    </AppShell>
  )
}
