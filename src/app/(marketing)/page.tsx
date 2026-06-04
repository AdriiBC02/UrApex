import Link from "next/link"
import { ChevronRight, BarChart2, Target, Zap, Shield, Trophy, TrendingUp, ArrowRight, Flag, Clock } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ChevronRight className="w-4 h-4 text-zinc-950 -ml-px" strokeWidth={3} />
            </div>
            <span className="text-base font-bold tracking-tight">
              <span className="text-cyan-400">Ur</span>
              <span className="text-zinc-100">Apex</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-semibold transition-colors shadow-lg shadow-cyan-500/20"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgb(6 182 212 / 0.8) 1px, transparent 1px), linear-gradient(90deg, rgb(6 182 212 / 0.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Gradient blobs */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-40 w-[400px] h-[400px] bg-cyan-400/4 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Le Mans Ultimate · More sims coming
            <span className="w-1 h-1 rounded-full bg-cyan-400/60" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-6">
            <span className="text-zinc-100">Your apex</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              starts here.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Import your sessions, understand your data, drive faster.
            UrApex turns raw lap times into a complete picture of how you drive.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-base transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-px"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 font-medium text-base transition-all"
            >
              Sign in
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-zinc-600 font-medium">
            {["Free to use", "No setup required", "Import in seconds", "Privacy first"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "9 types", label: "Goal types tracked" },
            { value: "3 scores", label: "Per-session analysis" },
            { value: "7 sims", label: "Planned simulators" },
            { value: "∞ laps", label: "No import limits" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-black text-zinc-100 mb-0.5 tracking-tight">{value}</div>
              <div className="text-xs text-zinc-600 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-100 mb-3">
            Everything you need to improve
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            Built for sim racers who want more than lap times.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, description, accent }) => (
            <div
              key={title}
              className={`relative rounded-2xl border p-6 overflow-hidden group hover:-translate-y-px transition-all ${
                accent
                  ? "border-cyan-800/60 bg-cyan-950/20 hover:border-cyan-700/60"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              {accent && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${
                accent ? "bg-cyan-500/15 border border-cyan-500/20" : "bg-zinc-800 border border-zinc-700"
              }`}>
                <Icon className={`w-5 h-5 ${accent ? "text-cyan-400" : "text-zinc-400"}`} />
              </div>
              <h3 className="font-bold text-zinc-100 mb-2 text-base">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-100 mb-3">
              Up and running in 60 seconds
            </h2>
            <p className="text-zinc-500">No config. No complex setup. Just import and go.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map(({ step, title, description }, i) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4 text-xl font-black text-cyan-400">
                  {step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute" />
                )}
                <h3 className="font-bold text-zinc-100 mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-cyan-950/10 to-zinc-950 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-6 py-28 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-100 mb-5">
            Ready to find your{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              apex?
            </span>
          </h2>
          <p className="text-zinc-400 mb-8 text-lg">
            Free. No credit card. Import your first session in under a minute.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-base transition-all shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-px"
          >
            Create free account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center">
              <ChevronRight className="w-3 h-3 text-cyan-400" strokeWidth={3} />
            </div>
            <span className="font-semibold text-zinc-500">UrApex</span>
          </div>
          <p>Built for sim racers who take it seriously.</p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: BarChart2,
    title: "Import in seconds",
    description: "Drop your XML result file and get a full breakdown instantly. Lap times, sectors, consistency — all calculated automatically.",
    accent: true,
  },
  {
    icon: TrendingUp,
    title: "Know your weaknesses",
    description: "Consistency Score, Safety Score, and Pace Score give you an honest read on how you drive and where to focus your training.",
    accent: false,
  },
  {
    icon: Target,
    title: "Set meaningful goals",
    description: "Target a specific lap time, clean lap count, or consistency score. Goals auto-update as you import new sessions.",
    accent: false,
  },
  {
    icon: Trophy,
    title: "Unlock achievements",
    description: "Century Driver, Consistency King, Endurance Pilot — milestones that reward real progress, not grinding.",
    accent: false,
  },
  {
    icon: Clock,
    title: "PB evolution tracking",
    description: "See every time you broke your personal best, per circuit and car combination. Your improvement, visualized.",
    accent: false,
  },
  {
    icon: Shield,
    title: "Multi-sim ready",
    description: "LMU supported now. ACC, iRacing, rFactor 2 and more on the roadmap. One platform for all your sims.",
    accent: false,
  },
]

const steps = [
  {
    step: "1",
    title: "Create your account",
    description: "Sign up in seconds. No credit card, no setup wizard, no BS.",
  },
  {
    step: "2",
    title: "Import a session",
    description: "Drag and drop your XML result file from Le Mans Ultimate. Done.",
  },
  {
    step: "3",
    title: "Analyze and improve",
    description: "See your lap breakdown, scores, and PB evolution immediately.",
  },
]
