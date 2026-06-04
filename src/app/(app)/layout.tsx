import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AppSidebar } from "@/components/layout/AppSidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="app-bg flex h-screen bg-zinc-950 overflow-hidden">
      {/* Bottom-left ambient blob */}
      <div
        className="fixed bottom-[-15%] left-[10%] w-[500px] h-[500px] pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgb(6 182 212 / 0.025) 0%, transparent 70%)" }}
      />
      <AppSidebar user={session.user} />
      <main className="relative flex-1 overflow-y-auto z-10">
        <div className="px-8 py-7 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
