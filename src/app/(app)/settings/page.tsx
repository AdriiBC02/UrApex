import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { Settings, User, Shield } from "lucide-react"
import { ProfileForm } from "@/features/auth/ProfileForm"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await db.driverProfile.findUnique({
    where: { userId: session.user.id },
  })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" icon={Settings} />

      {/* Profile */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            Profile
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Your public display information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialData={{
              displayName: profile?.displayName ?? user?.name ?? "",
              country: profile?.country ?? "",
              bio: profile?.bio ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* Account info (read-only for now) */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Email</p>
              <p className="text-sm text-zinc-300">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
