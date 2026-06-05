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

  // Achievements (31 total)
  const achievements = [
    // ── Volume ───────────────────────────────────────────────────────────────
    { slug: "first-import",       name: "First Session",      description: "Import your first session",                                     category: "volume",      rarity: "COMMON"    as const, condition: { type: "import_count",              threshold: 1    }, maxProgress: 1    },
    { slug: "laps-10",            name: "Lap Apprentice",     description: "Complete 10 valid laps",                                        category: "volume",      rarity: "COMMON"    as const, condition: { type: "lap_count",                 threshold: 10   }, maxProgress: 10   },
    { slug: "laps-100",           name: "Century Driver",     description: "Complete 100 valid laps",                                       category: "volume",      rarity: "RARE"      as const, condition: { type: "lap_count",                 threshold: 100  }, maxProgress: 100  },
    { slug: "laps-500",           name: "Road Warrior",       description: "Complete 500 valid laps",                                       category: "volume",      rarity: "EPIC"      as const, condition: { type: "lap_count",                 threshold: 500  }, maxProgress: 500  },
    { slug: "laps-1000",          name: "Elite Driver",       description: "Complete 1000 valid laps",                                      category: "volume",      rarity: "LEGENDARY" as const, condition: { type: "lap_count",                 threshold: 1000 }, maxProgress: 1000 },
    { slug: "sessions-10-month",  name: "Dedicated",          description: "Complete 10 sessions in a single month",                        category: "volume",      rarity: "UNCOMMON"  as const, condition: { type: "sessions_in_month",         threshold: 10   }, maxProgress: 10   },
    { slug: "sessions-50",        name: "Committed",          description: "Complete 50 sessions",                                          category: "volume",      rarity: "RARE"      as const, condition: { type: "session_count",             threshold: 50   }, maxProgress: 50   },
    { slug: "sessions-200",       name: "Sim Pro",            description: "Complete 200 sessions",                                         category: "volume",      rarity: "EPIC"      as const, condition: { type: "session_count",             threshold: 200  }, maxProgress: 200  },
    { slug: "hours-10",           name: "Night Owl",          description: "Accumulate 10 hours of driving",                                category: "volume",      rarity: "UNCOMMON"  as const, condition: { type: "hours_driven",              threshold: 10   }, maxProgress: 10   },
    { slug: "hours-50",           name: "Time Lord",          description: "Accumulate 50 hours of driving",                                category: "volume",      rarity: "EPIC"      as const, condition: { type: "hours_driven",              threshold: 50   }, maxProgress: 50   },
    // ── Pace ─────────────────────────────────────────────────────────────────
    { slug: "first-pb",           name: "Setting The Bar",    description: "Set your first personal best lap time",                         category: "pace",        rarity: "UNCOMMON"  as const, condition: { type: "pb_count",                  threshold: 1    }, maxProgress: 1    },
    { slug: "pbs-5",              name: "Speed Chaser",       description: "Set 5 personal bests across all circuits",                      category: "pace",        rarity: "RARE"      as const, condition: { type: "pb_count",                  threshold: 5    }, maxProgress: 5    },
    { slug: "pbs-10",             name: "Speed Demon",        description: "Set 10 personal bests across all circuits",                     category: "pace",        rarity: "EPIC"      as const, condition: { type: "pb_count",                  threshold: 10   }, maxProgress: 10   },
    { slug: "sector-hunter",      name: "Sector Hunter",      description: "Beat all three sector personal bests in a single session",      category: "pace",        rarity: "EPIC"      as const, condition: { type: "all_sector_pbs",            threshold: 1    }, maxProgress: 1    },
    // ── Consistency ──────────────────────────────────────────────────────────
    { slug: "consistency-king",   name: "Consistency King",   description: "Achieve a consistency score above 90 in a session",             category: "consistency", rarity: "RARE"      as const, condition: { type: "consistency_score_above",   threshold: 90   }, maxProgress: 1    },
    { slug: "rock-solid",         name: "Rock Solid",         description: "Achieve a consistency score above 95 in a session",             category: "consistency", rarity: "EPIC"      as const, condition: { type: "consistency_score_above",   threshold: 95   }, maxProgress: 1    },
    { slug: "on-rails",           name: "On Rails",           description: "Complete 5 sessions with consistency above 85",                 category: "consistency", rarity: "RARE"      as const, condition: { type: "consistency_sessions_count", threshold: 85, count: 5 }, maxProgress: 5 },
    // ── Endurance ────────────────────────────────────────────────────────────
    { slug: "endurance-stint",    name: "Endurance Pilot",    description: "Complete 20 valid laps in a single session",                    category: "endurance",   rarity: "UNCOMMON"  as const, condition: { type: "laps_in_session",           threshold: 20   }, maxProgress: 20   },
    { slug: "marathon-man",       name: "Marathon Man",       description: "Complete 50 valid laps in a single session",                    category: "endurance",   rarity: "RARE"      as const, condition: { type: "laps_in_session",           threshold: 50   }, maxProgress: 50   },
    { slug: "endurance-legend",   name: "Endurance Legend",   description: "Complete 100 valid laps in a single session",                   category: "endurance",   rarity: "LEGENDARY" as const, condition: { type: "laps_in_session",           threshold: 100  }, maxProgress: 100  },
    // ── Race craft ───────────────────────────────────────────────────────────
    { slug: "clean-race",         name: "Glass Clean",        description: "Complete a race with zero incidents",                           category: "safety",      rarity: "UNCOMMON"  as const, condition: { type: "clean_race",                threshold: 1    }, maxProgress: 1    },
    { slug: "podium",             name: "Podium",             description: "Finish in the top 3 in an online race",                         category: "race_craft",  rarity: "UNCOMMON"  as const, condition: { type: "race_position_lte",         threshold: 3    }, maxProgress: 1    },
    { slug: "race-winner",        name: "Race Winner",        description: "Finish P1 in an online race",                                   category: "race_craft",  rarity: "RARE"      as const, condition: { type: "race_position_lte",         threshold: 1    }, maxProgress: 1    },
    { slug: "hat-trick",          name: "Hat Trick",          description: "Win 3 online races",                                            category: "race_craft",  rarity: "EPIC"      as const, condition: { type: "race_wins_count",           threshold: 3    }, maxProgress: 3    },
    { slug: "iron-will",          name: "Iron Will",          description: "Complete 10 races without DNF",                                 category: "race_craft",  rarity: "RARE"      as const, condition: { type: "races_no_dnf_count",        threshold: 10   }, maxProgress: 10   },
    // ── Exploration ──────────────────────────────────────────────────────────
    { slug: "track-explorer",     name: "Track Explorer",     description: "Race at 3 different tracks",                                    category: "exploration", rarity: "COMMON"    as const, condition: { type: "unique_tracks_count",       threshold: 3    }, maxProgress: 3    },
    { slug: "track-collector",    name: "Track Collector",    description: "Race at 5 different tracks",                                    category: "exploration", rarity: "UNCOMMON"  as const, condition: { type: "unique_tracks_count",       threshold: 5    }, maxProgress: 5    },
    { slug: "world-traveler",     name: "World Traveler",     description: "Race at 10 different tracks",                                   category: "exploration", rarity: "RARE"      as const, condition: { type: "unique_tracks_count",       threshold: 10   }, maxProgress: 10   },
    { slug: "car-collector",      name: "Car Collector",      description: "Drive 5 different cars",                                        category: "exploration", rarity: "UNCOMMON"  as const, condition: { type: "unique_cars_count",         threshold: 5    }, maxProgress: 5    },
    { slug: "fleet-owner",        name: "Fleet Owner",        description: "Drive 10 different cars",                                       category: "exploration", rarity: "RARE"      as const, condition: { type: "unique_cars_count",         threshold: 10   }, maxProgress: 10   },
    { slug: "triple-threat",      name: "Triple Threat",      description: "Complete practice, qualifying and race at the same track",      category: "exploration", rarity: "RARE"      as const, condition: { type: "triple_threat",             threshold: 1    }, maxProgress: 1    },
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
