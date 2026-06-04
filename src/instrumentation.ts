export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startImportWorker } = await import("./server/workers/import.worker")
    startImportWorker()
  }
}
