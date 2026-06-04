import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function StatCardSkeleton() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <Skeleton className="h-3 w-16 mb-3 bg-zinc-800" />
        <Skeleton className="h-7 w-20 bg-zinc-800" />
      </CardContent>
    </Card>
  )
}

export function SessionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50">
      <Skeleton className="h-4 w-16 bg-zinc-800" />
      <Skeleton className="h-4 w-8 bg-zinc-800" />
      <Skeleton className="h-4 w-32 bg-zinc-800" />
      <Skeleton className="h-4 w-24 bg-zinc-800" />
      <Skeleton className="h-4 w-16 bg-zinc-800 ml-auto" />
      <Skeleton className="h-4 w-20 bg-zinc-800" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-48 mb-2 bg-zinc-800" />
        <Skeleton className="h-4 w-32 bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32 bg-zinc-800" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 bg-zinc-700" />
                <Skeleton className="h-3 w-24 bg-zinc-700" />
              </div>
              <Skeleton className="h-4 w-20 bg-zinc-700" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function SessionDetailSkeleton() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <Skeleton className="h-8 w-56 mb-2 bg-zinc-800" />
        <Skeleton className="h-4 w-80 bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-20 bg-zinc-800" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full bg-zinc-800" />
        </CardContent>
      </Card>
    </div>
  )
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5 flex gap-8">
        {[80, 60, 140, 110, 60, 50, 90, 70].map((w, i) => (
          <Skeleton key={i} className="h-3 bg-zinc-800" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SessionRowSkeleton key={i} />
      ))}
    </Card>
  )
}
