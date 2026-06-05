import { Queue } from "bullmq"
import { redisConnection } from "@/lib/redis"

export interface RecalculateJobData {
  userId: string
}

export const RECALCULATE_QUEUE_NAME = "recalculate"

let _queue: Queue<RecalculateJobData> | null = null

export function getRecalculateQueue(): Queue<RecalculateJobData> {
  if (!_queue) {
    _queue = new Queue<RecalculateJobData>(RECALCULATE_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 20 },
      },
    })
  }
  return _queue
}
