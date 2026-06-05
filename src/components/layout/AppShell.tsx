"use client"

import { useState } from "react"
import { Menu, ChevronRight } from "lucide-react"
import { AppSidebar } from "./AppSidebar"
import Link from "next/link"

interface AppShellProps {
  user: { name?: string | null; email?: string | null }
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-bg flex h-screen bg-zinc-950 overflow-hidden">
      {/* Ambient blob */}
      <div
        className="fixed bottom-[-15%] left-[10%] w-[500px] h-[500px] pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgb(6 182 212 / 0.025) 0%, transparent 70%)" }}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AppSidebar user={user} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <main className="relative flex-1 overflow-y-auto z-10 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/50 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -ml-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-950 -ml-px" strokeWidth={3} />
            </div>
            <span className="text-sm font-bold tracking-tight">
              <span className="text-cyan-400">Ur</span>
              <span className="text-zinc-100">Apex</span>
            </span>
          </Link>
        </div>

        <div className="px-4 py-5 lg:px-8 lg:py-7 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
