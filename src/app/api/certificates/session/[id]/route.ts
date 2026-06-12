import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import { formatLapTime } from "@/lib/time"
import {
  getTrackBackground,
  getTrackLogo,
  getManufacturerLogo,
  getUrApexLogo,
  getLmuLogo,
  loadFont,
} from "@/lib/lmu-assets"
import { buildCertificateJSX } from "@/lib/certificate-template"

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
  const { id } = await params

  const session = await db.session.findUnique({
    where: { id },
    include: {
      track:     { select: { name: true, slug: true } },
      car:       { select: { name: true } },
      carClass:  { select: { name: true } },
      _count:    { select: { participants: true, pitStops: true, incidents: true } },
    },
  })

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Auth: private sessions require being the owner
  if (!session.isPublic) {
    const authSession = await auth()
    if (!session.userId || authSession?.user?.id !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Load fonts
  const antonioFont = loadFont("Antonio-SemiBold.ttf")
  const lexendFont  = loadFont("Lexend-Black.ttf")
  const heeboFont   = loadFont("Heebo-Regular.ttf")
  const heeboBold   = loadFont("Heebo-Bold.ttf")

  if (!antonioFont || !lexendFont || !heeboFont || !heeboBold) {
    return NextResponse.json({ error: "Font assets missing" }, { status: 500 })
  }

  const trackSlug = session.track.slug
  const carName   = session.car.name

  const finishStatus = session.dq ? "DQ" : session.dnf ? "DNF" : "Finished Normally"

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
    carName,
    carClass:          session.carClass?.name ?? null,
    manufacturerB64:   getManufacturerLogo(carName),
    consistency:       session.consistencyScore,
    pitStops:          session._count.pitStops,
    incidents:         session._count.incidents,
    finishStatus,
    urApexLogoB64:     getUrApexLogo(),
    lmuLogoB64:        getLmuLogo(),
  }

  const svg = await satori(buildCertificateJSX(data), {
    width:  800,
    height: 1420,
    fonts: [
      { name: "Antonio", data: antonioFont, weight: 600, style: "normal" },
      { name: "Lexend",  data: lexendFont,  weight: 900, style: "normal" },
      { name: "Heebo",   data: heeboFont,   weight: 400, style: "normal" },
      { name: "Heebo",   data: heeboBold,   weight: 700, style: "normal" },
    ],
  })

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 800 } })
  const png = resvg.render().asPng()

  const slug = `${trackSlug}-${session.sessionType.toLowerCase()}-${session.sessionDate.toISOString().slice(0, 10)}`

  return new NextResponse(png.buffer as ArrayBuffer, {
    headers: {
      "Content-Type":        "image/png",
      "Content-Disposition": `attachment; filename="urapex-${slug}.png"`,
      "Cache-Control":       "public, max-age=3600",
    },
  })
}
