"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-950/50 border border-red-900/50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-200 mb-1">Something went wrong</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs">
        {error.message || "An unexpected error occurred. Try again or contact support."}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={reset}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      >
        Try again
      </Button>
    </div>
  )
}
