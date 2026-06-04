import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AppSidebar } from "@/components/layout/AppSidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <AppSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-7 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
