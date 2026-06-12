import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatLapTime } from "@/lib/time"
import { CertificateViewer } from "@/features/certificates/CertificateViewer"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

interface Props { params: Promise<{ id: string }> }

async function getSession(id: string) {
  return db.session.findUnique({
    where: { id },
    select: {
      id: true, isPublic: true, userId: true,
      sessionType: true, bestLapMs: true, sessionDate: true,
      track: { select: { name: true } },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const session = await getSession(id)
  if (!session) return { title: "Certificate — UrApex" }

  const lap   = formatLapTime(session.bestLapMs)
  const title = `${session.sessionType} at ${session.track.name} — UrApex`
  const desc  = `Best lap: ${lap} · Share your session certificate`
  const img   = `/api/certificates/session/${id}?format=portrait`

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [{ url: img, width: 1600, height: 2000 }] },
    twitter:    { card: "summary_large_image", title, description: desc, images: [img] },
  }
}

export default async function CertificatePage({ params }: Props) {
  const { id } = await params
  const session = await getSession(id)

  if (!session) notFound()
  // Certificate page is accessible to anyone with the link.
  // Session IDs are CUIDs — not guessable. Privacy flag only controls the full session detail.

  const bestLap = formatLapTime(session.bestLapMs) ?? "—"
  const date    = session.sessionDate.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor: "#0a0a0b" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,180,216,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-[#1e1e22]/60">
        <Link
          href={`/sessions/${session.id}`}
          className="flex items-center gap-1.5 text-xs text-[#4b5563] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Session
        </Link>
        <span
          className="text-xs font-bold tracking-[0.25em]"
          style={{ color: "#00b4d8" }}
        >
          URAPEX.ES
        </span>
        <div className="w-16" />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-5 py-8 gap-6">

        {/* Session badge */}
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold tracking-[0.2em] px-3 py-1 rounded-full border"
              style={{ color: "#00b4d8", borderColor: "#00b4d8", backgroundColor: "rgba(0,180,216,0.06)" }}
            >
              {session.sessionType}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white leading-tight">{session.track.name}</h1>
          <div className="flex items-center gap-2 text-sm text-[#6b7280] mt-0.5">
            <span>{date}</span>
            <span className="text-[#1e1e22]">·</span>
            <span className="font-mono" style={{ color: "#00b4d8" }}>{bestLap}</span>
          </div>
        </div>

        {/* Certificate viewer + share controls */}
        <CertificateViewer
          sessionId={session.id}
          sessionType={session.sessionType}
          trackName={session.track.name}
          bestLap={bestLap}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center border-t border-[#1e1e22]/40">
        <p className="text-[10px] text-[#374151] tracking-[0.25em] font-semibold">
          YOUR RACING JOURNEY, DOCUMENTED
        </p>
      </footer>
    </div>
  )
}
