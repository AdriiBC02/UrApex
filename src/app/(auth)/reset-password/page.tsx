"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function ResetPasswordPage() {
  const params          = useSearchParams()
  const router          = useRouter()
  const token           = params.get("token") ?? ""
  const [error, setErr] = useState<string | null>(null)
  const [loading, setL] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setL(true)

    const fd       = new FormData(e.currentTarget)
    const password = fd.get("password") as string
    const confirm  = fd.get("confirm") as string

    if (password !== confirm) { setErr("Passwords do not match"); setL(false); return }

    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? "Reset failed"); return }
      setDone(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch {
      setErr("Network error — please try again")
    } finally {
      setL(false)
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-sm text-zinc-400">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">
          Request a new one
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-8 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
        <h1 className="text-xl font-bold text-zinc-100">Password updated</h1>
        <p className="text-sm text-zinc-500">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-zinc-100">Set new password</h1>
        <p className="text-sm text-zinc-500 mt-1">Choose a password with at least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-300">New password</Label>
          <Input
            id="password" name="password" type="password"
            required minLength={8} autoComplete="new-password"
            className="bg-zinc-800/80 border-zinc-700 text-zinc-100 focus:border-cyan-500/60 focus:ring-cyan-500/20 h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium text-zinc-300">Confirm password</Label>
          <Input
            id="confirm" name="confirm" type="password"
            required minLength={8} autoComplete="new-password"
            className="bg-zinc-800/80 border-zinc-700 text-zinc-100 focus:border-cyan-500/60 focus:ring-cyan-500/20 h-10"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full h-10 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  )
}
