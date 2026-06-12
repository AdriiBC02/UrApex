"use client"

import { useState, useEffect } from "react"
import { Download, Share2, Copy, Check, MessageCircle } from "lucide-react"
import type { CertFormat } from "@/lib/certificate-template"

interface Props {
  sessionId:   string
  sessionType: string
  trackName:   string
  bestLap:     string
}

const FORMATS: { id: CertFormat; label: string; ratio: string }[] = [
  { id: "portrait", label: "Portrait", ratio: "4:5"  },
  { id: "mobile",   label: "Mobile",   ratio: "9:16" },
]

export function CertificateViewer({ sessionId, sessionType, trackName, bestLap }: Props) {
  const [format, setFormat]   = useState<CertFormat>("portrait")
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  // Resolved on client only to avoid SSR/client hydration mismatch
  const [pageUrl, setPageUrl]   = useState(`https://urapex.es/certificate/${sessionId}`)
  const [hasShare, setHasShare] = useState(false)
  useEffect(() => {
    setPageUrl(window.location.href)
    setHasShare("share" in navigator)
  }, [])

  const apiUrl     = `/api/certificates/session/${sessionId}?format=${format}`
  const shareTitle = `${sessionType} at ${trackName} — UrApex`
  const shareText  = `🏁 ${sessionType} at ${trackName} · Best lap: ${bestLap}\n\nCheck it out on UrApex`

  // Share the PNG image file directly — works on iOS/Android (Instagram, Twitter, WhatsApp…)
  async function handleNativeShare() {
    setSharing(true)
    try {
      const resp = await fetch(apiUrl)
      const blob = await resp.blob()
      const file = new File([blob], `urapex-${sessionType.toLowerCase()}-${format}.png`, { type: "image/png" })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText })
      } else {
        await navigator.share({ title: shareTitle, text: `${shareText}\n${pageUrl}`, url: pageUrl })
      }
    } catch {
      // User cancelled or not supported — ignore
    } finally {
      setSharing(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // For Twitter/WhatsApp: share the page URL — the OG image (certificate) will appear as preview
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}\n`)}&url=${encodeURIComponent(pageUrl)}`
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`
  const fmt         = FORMATS.find(f => f.id === format)!

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-[340px] mx-auto">

      {/* Format selector */}
      <div className="flex bg-[#0d0d0f] border border-[#1e1e22] rounded-full p-1 gap-0.5 self-center">
        {FORMATS.map(f => (
          <button
            key={f.id}
            onClick={() => { if (format !== f.id) { setFormat(f.id); setLoading(true) } }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200"
            style={{
              backgroundColor: format === f.id ? "#00b4d8" : "transparent",
              color: format === f.id ? "#0a0a0b" : "#4b5563",
            }}
          >
            {f.label}
            <span className="text-[10px] opacity-60">{f.ratio}</span>
          </button>
        ))}
        <button
          disabled
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold opacity-20 cursor-not-allowed"
          style={{ color: "#4b5563" }}
          title="Coming soon"
        >
          Wide <span className="text-[10px] opacity-60">16:9</span>
        </button>
      </div>

      {/* Certificate preview */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 0 1px #1e1e22, 0 20px 50px rgba(0,0,0,0.7), 0 0 40px rgba(0,180,216,0.06)" }}
      >
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f] z-10"
            style={{ minHeight: format === "mobile" ? 480 : 340 }}
          >
            <div className="w-5 h-5 border-2 border-[#00b4d8] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={format}
          src={apiUrl}
          alt={`${sessionType} at ${trackName} certificate`}
          className="w-full h-auto block"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>

      {/* Download — primary CTA */}
      <a
        href={`${apiUrl}&dl=1`}
        download
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundColor: "#00b4d8", color: "#0a0a0b" }}
      >
        <Download className="w-4 h-4 shrink-0" />
        Download {fmt.label} · {fmt.ratio}
      </a>

      {/* Share section */}
      <div className="w-full flex flex-col gap-2.5">
        <p className="text-[10px] text-[#374151] text-center tracking-[0.2em] font-semibold">SHARE</p>

        {/* Native share: sends the PNG file directly + message (iOS/Android) */}
        {hasShare && (
          <button
            onClick={handleNativeShare}
            disabled={sharing}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-[#1e1e22] transition-colors hover:border-[#2a2a30] hover:text-white disabled:opacity-50"
            style={{ color: sharing ? "#00b4d8" : "#9ca3af" }}
          >
            <Share2 className="w-4 h-4 shrink-0" />
            {sharing ? "Preparing…" : "Share Image"}
          </button>
        )}

        {/* URL-based: OG image (certificate) appears as preview in tweet/message */}
        <div className="flex gap-2">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold border border-[#1e1e22] text-[#9ca3af] hover:text-white hover:border-[#2a2a30] transition-colors"
          >
            𝕏&nbsp;Twitter
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border border-[#1e1e22] text-[#9ca3af] hover:text-white hover:border-[#2a2a30] transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            WhatsApp
          </a>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors"
            style={{
              color: copied ? "#00b4d8" : "#9ca3af",
              borderColor: copied ? "#00b4d820" : "#1e1e22",
            }}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 shrink-0" />Copied!</>
              : <><Copy className="w-3.5 h-3.5 shrink-0" />Copy link</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
