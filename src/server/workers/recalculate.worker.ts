import { Worker } from "bullmq"
import { redisConnection } from "@/lib/redis"
import { recalculateUserMetrics } from "@/server/services/recalculate.service"
import { RECALCULATE_QUEUE_NAME, type RecalculateJobData } from "@/server/queue/recalculate.queue"

let worker: Worker<RecalculateJobData> | null = null

export function startRecalculateWorker() {
  if (worker) return

  worker = new Worker<RecalculateJobData>(
    RECALCULATE_QUEUE_NAME,
    async (job) => {
      const result = await recalculateUserMetrics(job.data.userId)
      console.log(`[recalculate-worker] user=${job.data.userId}`, result)
    },
    { connection: redisConnection, concurrency: 1 }
  )

  worker.on("failed", (job, err) => {
    console.error(`[recalculate-worker] job ${job?.id} failed:`, err.message)
  })

  process.on("SIGTERM", () => worker?.close())
  process.on("SIGINT",  () => worker?.close())
}
