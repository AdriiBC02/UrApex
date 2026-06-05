import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Lock, Trophy, Clock } from "lucide-react"
import type { AchievementRarity } from "@prisma/client"

const RARITY_CONFIG: Record<AchievementRarity, {
  label: string
  border: string
  bg: string
  badge: string
  text: string
  glow: string
  icon: string
}> = {
  COMMON:    { label: "Common",    border: "border-zinc-700",      bg: "bg-zinc-900",         badge: "bg-zinc-800 text-zinc-400",          text: "text-zinc-400",   glow: "",                           icon: "⬡" },
  UNCOMMON:  { label: "Uncommon",  border: "border-green-800/60",  bg: "bg-green-950/10",     badge: "bg-green-900/60 text-green-400",     text: "text-green-400",  glow: "shadow-green-900/20",         icon: "◆" },
  RARE:      { label: "Rare",      border: "border-blue-800/60",   bg: "bg-blue-950/10",      badge: "bg-blue-900/60 text-blue-400",       text: "text-blue-400",   glow: "shadow-blue-900/20",          icon: "◈" },
  EPIC:      { label: "Epic",      border: "border-purple-800/60", bg: "bg-purple-950/10",    badge: "bg-purple-900/60 text-purple-400",   text: "text-purple-400", glow: "shadow-purple-900/30",        icon: "✦" },
  LEGENDARY: { label: "Legendary", border: "border-orange-700/60", bg: "bg-orange-950/10",    badge: "bg-orange-900/60 text-orange-400",   text: "text-orange-400", glow: "shadow-orange-900/40 shadow-lg", icon: "★" },
}

export default async function AchievementsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [all, userAchievements] = await Promise.all([
    db.achievement.findMany({ orderBy: [{ rarity: "asc" }, { name: "asc" }] }),
    db.userAchievement.findMany({ where: { userId } }),
  ])

  const achievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))
  const unlocked  = all.filter((a) => achievementMap.get(a.id)?.unlockedAt)
  const inProgress = all.filter((a) => {
    const ua = achievementMap.get(a.id)
    return ua && !ua.unlockedAt && ua.progress > 0
  })
  const locked = all.filter((a) => {
    const ua = achievementMap.get(a.id)
    return !ua || (!ua.unlockedAt && ua.progress === 0)
  })

  const pct = all.length > 0 ? Math.round((unlocked.length / all.length) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Achievements</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {unlocked.length} of {all.length} unlocked
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-zinc-300">Overall progress</span>
          <span className="text-sm font-bold text-zinc-100 tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-zinc-600">
          <span>{unlocked.length} unlocked</span>
          <span>{all.length - unlocked.length} remaining</span>
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon={Trophy} label="Unlocked" count={unlocked.length} color="text-cyan-400" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlocked.map((a) => {
              const ua = achievementMap.get(a.id)!
              return (
                <AchievementCard
                  key={a.id}
                  name={a.name}
                  description={a.description}
                  rarity={a.rarity}
                  state="unlocked"
                  unlockedAt={ua.unlockedAt!}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon={Clock} label="In progress" count={inProgress.length} color="text-zinc-400" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inProgress.map((a) => {
              const ua = achievementMap.get(a.id)!
              const progressPct = Math.min(100, (ua.progress / a.maxProgress) * 100)
              return (
                <AchievementCard
                  key={a.id}
                  name={a.name}
                  description={a.description}
                  rarity={a.rarity}
                  state="progress"
                  progress={progressPct}
                  progressLabel={`${ua.progress.toFixed(0)} / ${a.maxProgress.toFixed(0)}`}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon={Lock} label="Locked" count={locked.length} color="text-zinc-600" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map((a) => (
              <AchievementCard
                key={a.id}
                name={a.name}
                description={a.description}
                rarity={a.rarity}
                state="locked"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionLabel({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType
  label: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{label}</h2>
      <span className="text-xs text-zinc-700 font-mono">{count}</span>
    </div>
  )
}

function AchievementCard({
  name,
  description,
  rarity,
  state,
  unlockedAt,
  progress,
  progressLabel,
}: {
  name: string
  description: string
  rarity: AchievementRarity
  state: "unlocked" | "progress" | "locked"
  unlockedAt?: Date
  progress?: number
  progressLabel?: string
}) {
  const cfg = RARITY_CONFIG[rarity]
  const isLocked = state === "locked"
  const isUnlocked = state === "unlocked"

  return (
    <div className={`
      relative rounded-xl border p-4 transition-all
      ${cfg.border} ${cfg.bg}
      ${isUnlocked ? `shadow-md ${cfg.glow}` : ""}
      ${isLocked ? "opacity-45" : ""}
    `}>
      {/* Legendary shimmer */}
      {rarity === "LEGENDARY" && isUnlocked && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative">
        {/* Top row: icon + rarity */}
        <div className="flex items-start justify-between mb-3">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
            border ${cfg.border}
            ${isLocked ? "bg-zinc-800/60" : cfg.bg}
            ${isUnlocked ? cfg.glow : ""}
          `}>
            {isLocked
              ? <Lock className="w-4 h-4 text-zinc-600" />
              : <span className={cfg.text}>{cfg.icon}</span>
            }
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Name + description */}
        <h3 className={`text-sm font-semibold mb-1 ${isLocked ? "text-zinc-500" : "text-zinc-200"}`}>
          {name}
        </h3>
        <p className={`text-xs leading-relaxed ${isLocked ? "text-zinc-600" : "text-zinc-500"}`}>
          {description}
        </p>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60">
            <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
              <span className="font-mono tabular-nums">{progressLabel}</span>
              <span className="font-semibold tabular-nums">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cfg.text.replace("text-", "bg-")}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Unlocked date */}
        {unlockedAt && (
          <p className={`text-[10px] mt-3 pt-2 border-t border-zinc-800/40 ${cfg.text} opacity-70`}>
            Unlocked {new Date(unlockedAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  )
}
