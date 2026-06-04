import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight, BarChart2, Target, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-cyan-500 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-zinc-950 -ml-0.5" strokeWidth={3} />
          </div>
          <span className="text-lg font-bold text-cyan-400 tracking-tight">UrApex</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold">
              Get started free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8">
          <Zap className="w-3.5 h-3.5" />
          Le Mans Ultimate · More sims coming soon
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Your apex starts here.
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          Import your sessions, understand your data, drive faster.
          UrApex turns raw lap times into a complete picture of how you drive — and what to fix next.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold h-12 px-8">
              Start for free
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart2,
              title: "Import in seconds",
              description: "Drop your XML result file and get a full session breakdown instantly. Lap times, sectors, consistency — all calculated automatically.",
            },
            {
              icon: Target,
              title: "Know your weaknesses",
              description: "Consistency Score, Safety Score, and Pace Score give you an honest read of how you're driving — and where to focus.",
            },
            {
              icon: Zap,
              title: "Track real progress",
              description: "See how your best lap evolves week over week. Set goals, unlock achievements, and understand if you're actually improving.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-zinc-100 mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
