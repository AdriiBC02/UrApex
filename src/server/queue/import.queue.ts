import { Queue } from "bullmq"
import { redisConnection } from "@/lib/redis"

export interface ImportJobData {
  importFileId: string
}

export const IMPORT_QUEUE_NAME = "import"

let _queue: Queue<ImportJobData> | null = null

export function getImportQueue(): Queue<ImportJobData> {
  if (!_queue) {
    _queue = new Queue<ImportJobData>(IMPORT_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    })
  }
  return _queue
}
