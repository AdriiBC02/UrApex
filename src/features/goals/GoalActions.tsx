"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface GoalActionsProps {
  goalId: string
  status: "ACTIVE" | "COMPLETED" | "ABANDONED"
}

export function GoalActions({ goalId, status }: GoalActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function patch(body: object) {
    setLoading(true)
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
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

  async function deleteGoal() {
    setLoading(true)
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Goal deleted")
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
        <MoreHorizontal className="w-4 h-4" />
        <span className="sr-only">Goal actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700 text-zinc-200 w-44">
        {status === "ACTIVE" && (
          <DropdownMenuItem
            className="gap-2 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
            onClick={() => {
              toast.promise(patch({ status: "COMPLETED" }), {
                loading: "Marking complete…",
                success: "Goal completed!",
                error: "Something went wrong",
              })
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            Mark as complete
          </DropdownMenuItem>
        )}
        {status === "ACTIVE" && (
          <DropdownMenuItem
            className="gap-2 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
            onClick={() => patch({ status: "ABANDONED" })}
          >
            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            Abandon goal
          </DropdownMenuItem>
        )}
        {status !== "ACTIVE" && (
          <DropdownMenuItem
            className="gap-2 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
            onClick={() => patch({ status: "ACTIVE" })}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Reactivate
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem
          className="gap-2 text-red-400 focus:bg-zinc-800 focus:text-red-300 cursor-pointer"
          onClick={deleteGoal}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete goal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
