import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { Trophy } from "lucide-react"
import type { AchievementRarity } from "@prisma/client"

const RARITY_STYLES: Record<AchievementRarity, { badge: string; ring: string; glow: string }> = {
  COMMON:    { badge: "bg-zinc-700 text-zinc-300", ring: "border-zinc-700", glow: "" },
  UNCOMMON:  { badge: "bg-green-900 text-green-300", ring: "border-green-800", glow: "shadow-green-900/20" },
  RARE:      { badge: "bg-blue-900 text-blue-300", ring: "border-blue-800", glow: "shadow-blue-900/20" },
  EPIC:      { badge: "bg-purple-900 text-purple-300", ring: "border-purple-800", glow: "shadow-purple-900/20" },
  LEGENDARY: { badge: "bg-orange-900 text-orange-300", ring: "border-orange-700", glow: "shadow-orange-900/30" },
}

export default async function AchievementsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [all, userAchievements] = await Promise.all([
    db.achievement.findMany({ orderBy: [{ rarity: "asc" }, { name: "asc" }] }),
    db.userAchievement.findMany({ where: { userId }, include: { achievement: false } }),
  ])

  const achievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))
  const unlocked = all.filter((a) => achievementMap.get(a.id)?.unlockedAt)
  const inProgress = all.filter((a) => {
    const ua = achievementMap.get(a.id)
    return ua && !ua.unlockedAt && ua.progress > 0
  })
  const locked = all.filter((a) => {
    const ua = achievementMap.get(a.id)
    return !ua || (!ua.unlockedAt && ua.progress === 0)
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Achievements"
        description={`${unlocked.length} of ${all.length} unlocked`}
        icon={Trophy}
      />

      {/* Summary bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all"
            style={{ width: `${(unlocked.length / all.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-zinc-500 shrink-0">
          {Math.round((unlocked.length / all.length) * 100)}%
        </span>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Unlocked</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlocked.map((a) => {
              const ua = achievementMap.get(a.id)!
              const styles = RARITY_STYLES[a.rarity]
              return (
                <AchievementCard
                  key={a.id}
                  name={a.name}
                  description={a.description}
                  rarity={a.rarity}
                  styles={styles}
                  unlockedAt={ua.unlockedAt!}
                  unlocked
                />
              )
            })}
          </div>
        </section>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">In progress</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inProgress.map((a) => {
              const ua = achievementMap.get(a.id)!
              const styles = RARITY_STYLES[a.rarity]
              const progressPct = (ua.progress / a.maxProgress) * 100
              return (
                <AchievementCard
                  key={a.id}
                  name={a.name}
                  description={a.description}
                  rarity={a.rarity}
                  styles={styles}
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
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Locked</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map((a) => {
              const styles = RARITY_STYLES[a.rarity]
              return (
                <AchievementCard
                  key={a.id}
                  name={a.name}
                  description={a.description}
                  rarity={a.rarity}
                  styles={styles}
                  locked
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function AchievementCard({
  name, description, rarity, styles, unlocked, locked, unlockedAt, progress, progressLabel,
}: {
  name: string
  description: string
  rarity: AchievementRarity
  styles: typeof RARITY_STYLES[AchievementRarity]
  unlocked?: boolean
  locked?: boolean
  unlockedAt?: Date
  progress?: number
  progressLabel?: string
}) {
  return (
    <div className={`
      relative bg-zinc-900 border rounded-xl p-4 transition-all
      ${styles.ring}
      ${unlocked ? `shadow-lg ${styles.glow}` : "opacity-60"}
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">
          {locked ? "🔒" : unlocked ? "🏆" : "⏳"}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${styles.badge}`}>
          {rarity.toLowerCase()}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-0.5">{name}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>{progressLabel}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {unlockedAt && (
        <p className="text-[10px] text-zinc-600 mt-2">
          Unlocked {new Date(unlockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}
    </div>
  )
}
