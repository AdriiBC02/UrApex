"use client"

import { Share2 } from "lucide-react"

export function ShareCertificateButton({ sessionId }: { sessionId: string }) {
  return (
    <a
      href={`/api/certificates/session/${sessionId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-1.5"
    >
      <Share2 className="w-3.5 h-3.5" />
      Share
    </a>
  )
}
