import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Settings, User, Shield, Gamepad2, KeyRound, Download } from "lucide-react"
import { ProfileForm } from "@/features/auth/ProfileForm"
import { SimDriverForm } from "@/features/auth/SimDriverForm"
import { ApiKeyForm } from "@/features/auth/ApiKeyForm"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [profile, user] = await Promise.all([
    db.driverProfile.findUnique({ where: { userId: session.user.id } }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, apiKey: true },
    }),
  ])

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your profile and account preferences.</p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
          <User className="w-3.5 h-3.5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Profile</h2>
          <span className="text-xs text-zinc-600 ml-auto">Public display information</span>
        </div>
        <div className="p-5">
          <ProfileForm
            initialData={{
              displayName: profile?.displayName ?? user?.name ?? "",
              country: profile?.country ?? "",
              bio: profile?.bio ?? "",
            }}
          />
        </div>
      </div>

      {/* Simulator identity */}
      <div id="simulator" className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
          <Gamepad2 className="w-3.5 h-3.5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Simulator identity</h2>
          <span className="text-xs text-zinc-600 ml-auto">Used to identify your laps in result files</span>
        </div>
        <div className="p-5">
          <SimDriverForm initialName={profile?.simDriverName ?? ""} />
        </div>
      </div>

      {/* Companion app API key */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
          <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Companion app</h2>
          <span className="text-xs text-zinc-600 ml-auto">Auto-sync from your PC</span>
        </div>
        <div className="p-5">
          <ApiKeyForm
            hasKey={Boolean(user?.apiKey)}
            preview={user?.apiKey ? `...${user.apiKey.slice(-8)}` : null}
          />
        </div>
      </div>

      {/* Data export */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
          <Download className="w-3.5 h-3.5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Data export</h2>
          <span className="text-xs text-zinc-600 ml-auto">CSV download</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-zinc-500">Download your data as CSV files for external analysis.</p>
          <div className="flex gap-3">
            <a
              href="/api/export/sessions"
              download
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Sessions CSV
            </a>
            <a
              href="/api/export/laps"
              download
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Laps CSV
            </a>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/60">
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Account</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Email</p>
            <p className="text-sm text-zinc-300 font-medium">{user?.email}</p>
          </div>
          <div className="pt-3 border-t border-zinc-800/60">
            <p className="text-xs text-zinc-600">
              Password changes and account deletion coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
