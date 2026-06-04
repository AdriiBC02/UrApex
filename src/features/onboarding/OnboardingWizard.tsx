"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UploadZone } from "@/features/import/UploadZone"
import { BarChart2, Target, Shield, Zap, ChevronRight, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface OnboardingWizardProps {
  displayName: string
}

const FEATURES = [
  { icon: BarChart2, label: "Lap & sector analytics", color: "text-cyan-400" },
  { icon: Target,    label: "Personal best tracking", color: "text-green-400" },
  { icon: Shield,    label: "Consistency & safety scores", color: "text-blue-400" },
  { icon: Zap,       label: "Goals & achievements", color: "text-orange-400" },
]

export function OnboardingWizard({ displayName }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [importedSessionId, setImportedSessionId] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const router = useRouter()

  async function finish() {
    setFinishing(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDone: true }),
      })
      router.push(importedSessionId ? `/sessions/${importedSessionId}` : "/dashboard")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
      setFinishing(false)
    }
  }

  function handleImported(sessionId: string) {
    setImportedSessionId(sessionId)
    setStep(3)
  }

  return (
    <div className="w-full max-w-lg">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? "w-8 bg-cyan-500" : s < step ? "w-4 bg-cyan-500/40" : "w-4 bg-zinc-700"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Welcome */}
      {step === 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl">⚡</span>
              <span className="text-lg font-bold text-zinc-100 tracking-tight">UrApex</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight leading-tight">
              Welcome{displayName ? `, ${displayName.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Your sim racing intelligence platform. Turn every session into data you can act on.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-800">
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <span className="text-xs text-zinc-400 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
          >
            Get started
            <ChevronRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-zinc-600">
            Already have data?{" "}
            <button onClick={finish} className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">
              Skip setup
            </button>
          </p>
        </div>
      )}

      {/* Step 2 — Upload */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-1">
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Upload your first session</h2>
            <p className="text-sm text-zinc-500">
              Drop your Le Mans Ultimate XML result file. You&apos;ll pick your driver name from the list.
            </p>
          </div>

          <UploadZone onImported={handleImported} />

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← Back
            </button>
            <button onClick={finish} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Skip for now →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">You&apos;re all set!</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Your first session is imported. Time to see your data.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-left text-sm text-zinc-400 bg-zinc-800/40 rounded-xl p-4 border border-zinc-800">
            <p className="font-medium text-zinc-300">What&apos;s next:</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" /> Review your lap times and scores</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" /> Import more sessions to track progress</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" /> Set a goal for your next PB</li>
            </ul>
          </div>

          <button
            onClick={finish}
            disabled={finishing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
          >
            {finishing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
            ) : (
              <>View my session <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
