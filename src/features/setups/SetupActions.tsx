"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Star, StarOff, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function SetupActions({ setupId, isFavorite }: { setupId: string; isFavorite: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function patch(body: object) {
    setLoading(true)
    try {
      const res = await fetch(`/api/setups/${setupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function deleteSetup() {
    setLoading(true)
    try {
      const res = await fetch(`/api/setups/${setupId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Setup deleted")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="h-7 w-7 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-zinc-200 w-44">
        <DropdownMenuItem
          className="gap-2 focus:bg-zinc-800 cursor-pointer"
          onClick={() => patch({ isFavorite: !isFavorite })}
        >
          {isFavorite
            ? <><StarOff className="w-3.5 h-3.5 text-zinc-500" /> Remove favourite</>
            : <><Star className="w-3.5 h-3.5 text-yellow-400" /> Mark favourite</>}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 focus:bg-zinc-800 cursor-pointer"
          onClick={() => patch({ isObsolete: true })}
        >
          Archive setup
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem
          className="gap-2 text-red-400 focus:bg-zinc-800 focus:text-red-300 cursor-pointer"
          onClick={deleteSetup}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
