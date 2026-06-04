import Link from "next/link"
import { ChevronRight, TrendingUp, Target, Trophy } from "lucide-react"

const bullets = [
  { icon: TrendingUp, text: "Lap-by-lap performance breakdown" },
  { icon: Target,     text: "Goal tracking with auto-progress" },
  { icon: Trophy,     text: "Achievements for real milestones" },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-zinc-950">

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-[440px] shrink-0 relative overflow-hidden border-r border-zinc-800/60 p-10">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgb(6 182 212) 1px, transparent 1px), linear-gradient(90deg, rgb(6 182 212) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group mb-auto">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <ChevronRight className="w-4 h-4 text-zinc-950 -ml-px" strokeWidth={3} />
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-cyan-400">Ur</span>
              <span className="text-zinc-100">Apex</span>
            </span>
          </Link>

          {/* Copy */}
          <div className="py-12">
            <p className="text-xs font-semibold text-cyan-500 uppercase tracking-widest mb-4">
              Sim Racing Analytics
            </p>
            <h2 className="text-3xl font-black tracking-tight text-zinc-100 leading-tight mb-6">
              Know exactly how
              <br />
              <span className="text-cyan-400">fast you really are.</span>
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed mb-8 max-w-xs">
              Import your sessions, track your progress, and understand what's holding you back.
            </p>

            <div className="space-y-3">
              {bullets.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span className="text-sm text-zinc-400">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-zinc-700">
            Free to use · No credit card required
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-zinc-950 -ml-px" strokeWidth={3} />
            </div>
            <span className="text-lg font-black">
              <span className="text-cyan-400">Ur</span>
              <span className="text-zinc-100">Apex</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
