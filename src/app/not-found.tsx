import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-md bg-cyan-500 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-zinc-950 -ml-0.5" strokeWidth={3} />
          </div>
          <span className="text-lg font-bold text-cyan-400 tracking-tight">UrApex</span>
        </div>
        <p className="text-7xl font-bold font-mono text-zinc-800 mb-4">404</p>
        <h1 className="text-xl font-semibold text-zinc-200 mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-8 max-w-xs mx-auto">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/dashboard">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold">
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
