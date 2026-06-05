"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [error, setSent]    = useState<string | null>(null)
  const [loading, setLoad]  = useState(false)
  const [done, setDone]     = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSent(null)
    setLoad(true)

    const email = (new FormData(e.currentTarget)).get("email") as string
    try {
      await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      setDone(true)
    } catch {
      setSent("Network error — please try again")
    } finally {
      setLoad(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-8 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
        <h1 className="text-xl font-bold text-zinc-100">Check your inbox</h1>
        <p className="text-sm text-zinc-500">
          If that email is registered, you&apos;ll receive a reset link shortly.
          The link expires in 1 hour.
        </p>
        <Link href="/login" className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-zinc-100">Forgot your password?</h1>
        <p className="text-sm text-zinc-500 mt-1">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-zinc-300">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="driver@example.com"
            className="bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/60 focus:ring-cyan-500/20 h-10"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-600">
        Remembered it?{" "}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
