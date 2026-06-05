import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AppShell } from "@/components/layout/AppShell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const profile = await db.driverProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingDone: true },
  })
  if (profile && !profile.onboardingDone) redirect("/onboarding")

  return <AppShell user={session.user}>{children}</AppShell>
}
