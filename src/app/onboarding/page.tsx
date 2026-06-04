import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await db.driverProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingDone: true, displayName: true },
  })

  // Already done → go to dashboard
  if (profile?.onboardingDone) redirect("/dashboard")

  return (
    <OnboardingWizard
      displayName={profile?.displayName ?? session.user.name ?? ""}
    />
  )
}
