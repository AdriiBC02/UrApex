import path from "node:path"
import { defineConfig } from "prisma/config"
import { config as loadDotenv } from "dotenv"
import { expand as expandDotenv } from "dotenv-expand"

// Load .env files before prisma CLI reads env vars
expandDotenv(loadDotenv({ path: path.join(process.cwd(), ".env") }))
expandDotenv(loadDotenv({ path: path.join(process.cwd(), ".env.local"), override: true }))

export default defineConfig({
  schema: path.join(process.cwd(), "prisma/schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
})
