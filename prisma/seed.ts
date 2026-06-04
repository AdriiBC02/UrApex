import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Simulators
  const simulators = [
    { slug: "lmu", name: "Le Mans Ultimate" },
    { slug: "acc", name: "Assetto Corsa Competizione" },
    { slug: "iracing", name: "iRacing" },
    { slug: "rf2", name: "rFactor 2" },
    { slug: "rr", name: "RaceRoom Racing Experience" },
    { slug: "ams2", name: "Automobilista 2" },
    { slug: "ac", name: "Assetto Corsa" },
  ]

  for (const sim of simulators) {
    await db.simulator.upsert({
      where: { slug: sim.slug },
      update: { name: sim.name },
      create: { ...sim, isActive: sim.slug === "lmu" },
    })
  }
  console.log(`  ✓ ${simulators.length} simulators seeded`)

  // Initial achievements
  const achievements = [
    {
      slug: "first-import",
      name: "First Import",
      description: "Import your first session",
      category: "general",
      rarity: "COMMON" as const,
      condition: { type: "import_count", threshold: 1 },
      maxProgress: 1,
    },
    {
      slug: "laps-100",
      name: "Century Driver",
      description: "Complete 100 laps",
      category: "general",
      rarity: "COMMON" as const,
      condition: { type: "lap_count", threshold: 100 },
      maxProgress: 100,
    },
    {
      slug: "laps-500",
      name: "Road Warrior",
      description: "Complete 500 laps",
      category: "general",
      rarity: "UNCOMMON" as const,
      condition: { type: "lap_count", threshold: 500 },
      maxProgress: 500,
    },
    {
      slug: "laps-1000",
      name: "Elite Driver",
      description: "Complete 1000 laps",
      category: "general",
      rarity: "RARE" as const,
      condition: { type: "lap_count", threshold: 1000 },
      maxProgress: 1000,
    },
    {
      slug: "first-pb",
      name: "Setting The Bar",
      description: "Set your first personal best",
      category: "pace",
      rarity: "COMMON" as const,
      condition: { type: "pb_count", threshold: 1 },
      maxProgress: 1,
    },
    {
      slug: "consistency-king",
      name: "Consistency King",
      description: "Achieve a consistency score above 90 in a session",
      category: "consistency",
      rarity: "UNCOMMON" as const,
      condition: { type: "consistency_score_above", threshold: 90 },
      maxProgress: 1,
    },
    {
      slug: "clean-race",
      name: "Glass Clean",
      description: "Complete a race with zero incidents",
      category: "safety",
      rarity: "UNCOMMON" as const,
      condition: { type: "clean_race", threshold: 1 },
      maxProgress: 1,
    },
    {
      slug: "endurance-stint",
      name: "Endurance Pilot",
      description: "Complete 20 valid laps in a single session",
      category: "endurance",
      rarity: "UNCOMMON" as const,
      condition: { type: "laps_in_session", threshold: 20 },
      maxProgress: 20,
    },
    {
      slug: "sessions-10-month",
      name: "Dedicated",
      description: "Complete 10 sessions in a single month",
      category: "general",
      rarity: "UNCOMMON" as const,
      condition: { type: "sessions_in_month", threshold: 10 },
      maxProgress: 10,
    },
    {
      slug: "sector-hunter",
      name: "Sector Hunter",
      description: "Beat all three sector personal bests in a single session",
      category: "pace",
      rarity: "RARE" as const,
      condition: { type: "all_sector_pbs", threshold: 1 },
      maxProgress: 1,
    },
  ]

  for (const ach of achievements) {
    await db.achievement.upsert({
      where: { slug: ach.slug },
      update: ach,
      create: ach,
    })
  }
  console.log(`  ✓ ${achievements.length} achievements seeded`)

  console.log("Seeding complete.")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
