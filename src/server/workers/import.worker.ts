import { Worker } from "bullmq"
import { redisConnection } from "@/lib/redis"
import { processImport } from "@/server/services/import.service"
import { IMPORT_QUEUE_NAME, type ImportJobData } from "@/server/queue/import.queue"

let worker: Worker<ImportJobData> | null = null

export function startImportWorker() {
  if (worker) return

  worker = new Worker<ImportJobData>(
    IMPORT_QUEUE_NAME,
    async (job) => {
      await processImport(job.data.importFileId)
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  )

  worker.on("failed", (job, err) => {
    console.error(`[import-worker] job ${job?.id} failed:`, err.message)
  })

  process.on("SIGTERM", () => worker?.close())
  process.on("SIGINT",  () => worker?.close())
}
