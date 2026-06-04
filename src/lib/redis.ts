import { ConnectionOptions } from "bullmq"

const url = process.env.REDIS_URL ?? "redis://localhost:6379"
const parsed = new URL(url)

export const redisConnection: ConnectionOptions = {
  host: parsed.hostname,
  port: Number(parsed.port) || 6379,
  password: parsed.password || undefined,
  tls: parsed.protocol === "rediss:" ? {} : undefined,
}
