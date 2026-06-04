import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { UploadZone } from "@/features/import/UploadZone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const imports = await db.importFile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { session: { select: { id: true } }, simulator: { select: { name: true } } },
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Import sessions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Drop your Le Mans Ultimate XML result files to import sessions.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <UploadZone />
        </CardContent>
      </Card>

      {imports.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300">Import history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-sm text-zinc-400 font-mono truncate flex-1">
                    {imp.originalName}
                  </span>
                  {imp.simulator && (
                    <span className="text-xs text-zinc-600 shrink-0">{imp.simulator.name}</span>
                  )}
                  <ImportStatusBadge status={imp.status} />
                  <span className="text-xs text-zinc-600 shrink-0">
                    {formatDistanceToNow(imp.createdAt, { addSuffix: true })}
                  </span>
                  {imp.session?.id && (
                    <Link
                      href={`/sessions/${imp.session.id}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300 shrink-0"
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ImportStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING:   { label: "Pending",   className: "bg-yellow-950 text-yellow-400" },
    PARSING:   { label: "Parsing",   className: "bg-blue-950 text-blue-400" },
    IMPORTED:  { label: "Imported",  className: "bg-green-950 text-green-400" },
    FAILED:    { label: "Failed",    className: "bg-red-950 text-red-400" },
    DUPLICATE: { label: "Duplicate", className: "bg-zinc-800 text-zinc-500" },
  }
  const { label, className } = map[status] ?? { label: status, className: "bg-zinc-800 text-zinc-400" }
  return <Badge className={`text-[10px] h-4 px-1.5 border-0 shrink-0 ${className}`}>{label}</Badge>
}
