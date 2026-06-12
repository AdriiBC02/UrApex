import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Resvg } from "@resvg/resvg-js"
import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { formatLapTime } from "@/lib/time"
import {
  getTrackBackground,
  getTrackLogo,
  getManufacturerLogo,
  getUrApexLogo,
  getLmuLogo,
  loadFont,
} from "@/lib/lmu-assets"
import { buildCertificateJSX, CERT_DIMS, type CertFormat } from "@/lib/certificate-template"

const _require = createRequire(import.meta.url)

// Force CJS build of satori/standalone — avoids ESM/WASM TLA issues in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let satoriReady: Promise<any> | null = null
function getSatori() {
  if (!satoriReady) {
    satoriReady = (async () => {
      const m = _require("satori/standalone")
      const satori = m.default ?? m
      await m.init(fs.readFileSync(path.join(process.cwd(), "node_modules/satori/yoga.wasm")))
      return satori
    })()
  }
  return satoriReady
}

function formatDuration(sec: number | null): string {
  if (!sec) return "—"
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await handler(req, params)
  } catch (e) {
    console.error("[cert] unhandled:", e)
    return NextResponse.json({ error: "unhandled", detail: String(e) }, { status: 500 })
  }
}

async function handler(req: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params
  const sp = req.nextUrl.searchParams

  const format  = (sp.get("format") ?? "portrait") as CertFormat
  const isDownload = sp.get("dl") === "1"

  const session = await db.session.findUnique({
    where: { id },
    include: {
      track:    { select: { name: true, slug: true } },
      car:      { select: { name: true } },
      carClass: { select: { name: true } },
      _count:   { select: { participants: true, pitStops: true, incidents: true } },
    },
  })

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })
  // Certificates are accessible to anyone with the link — session IDs are CUIDs (not guessable).
  // The privacy flag applies to the full session detail page, not to the certificate card.

  const antonioFont = loadFont("Antonio-SemiBold.ttf")
  const lexendFont  = loadFont("Lexend-Black.ttf")
  const heeboFont   = loadFont("Heebo-Regular.ttf")
  const heeboBold   = loadFont("Heebo-Bold.ttf")

  if (!antonioFont || !lexendFont || !heeboFont || !heeboBold)
    return NextResponse.json({ error: "Font assets missing" }, { status: 500 })

  const finishStatus = session.dq ? "DQ" : session.dnf ? "DNF" : "Finished Normally"
  const trackSlug    = session.track.slug
  const data = {
    sessionType:       session.sessionType,
    sessionDate:       formatDate(session.sessionDate),
    duration:          formatDuration(session.durationSec),
    isNewPB:           session.isNewPB,
    isOnline:          session.isOnline,
    trackName:         session.track.name,
    trackLogoB64:      getTrackLogo(trackSlug),
    trackBgB64:        getTrackBackground(trackSlug),
    finalPosition:     session.finalPosition,
    totalParticipants: session._count.participants,
    bestLap:           formatLapTime(session.bestLapMs),
    totalLaps:         session.totalLaps,
    carName:           session.car.name,
    carClass:          session.carClass?.name ?? null,
    manufacturerB64:   getManufacturerLogo(session.car.name),
    consistency:       session.consistencyScore,
    pitStops:          session._count.pitStops,
    incidents:         session._count.incidents,
    finishStatus,
    urApexLogoB64:     getUrApexLogo(),
    lmuLogoB64:        getLmuLogo(),
  }

  const { w, h } = CERT_DIMS[format]
  const satori   = await getSatori()

  let svg: string
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svg = await satori(buildCertificateJSX(data, format) as any, {
      width: w, height: h,
      fonts: [
        { name: "Antonio", data: antonioFont, weight: 600, style: "normal" },
        { name: "Lexend",  data: lexendFont,  weight: 900, style: "normal" },
        { name: "Heebo",   data: heeboFont,   weight: 400, style: "normal" },
        { name: "Heebo",   data: heeboBold,   weight: 700, style: "normal" },
      ],
    })
  } catch (e) {
    console.error("[cert] satori:", e)
    return NextResponse.json({ error: "satori", detail: String(e) }, { status: 500 })
  }

  let png: Uint8Array
  try {
    // Render at 2× for crisp retina output
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: w * 2 } })
    png = resvg.render().asPng()
  } catch (e) {
    console.error("[cert] resvg:", e)
    return NextResponse.json({ error: "resvg", detail: String(e) }, { status: 500 })
  }

  const slug = `${trackSlug}-${session.sessionType.toLowerCase()}-${session.sessionDate.toISOString().slice(0, 10)}-${format}`

  return new NextResponse(png.buffer as ArrayBuffer, {
    headers: {
      "Content-Type":        "image/png",
      "Content-Disposition": isDownload
        ? `attachment; filename="urapex-${slug}.png"`
        : "inline",
      "Cache-Control":       "public, max-age=3600",
    },
  })
}
