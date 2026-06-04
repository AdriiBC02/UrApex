import fs from "fs/promises"
import path from "path"

export interface StorageService {
  save(buffer: Buffer, key: string): Promise<string>
  read(storagePath: string): Promise<Buffer>
  delete(storagePath: string): Promise<void>
  exists(storagePath: string): Promise<boolean>
}

// ─── Local filesystem implementation (dev + single-instance prod) ─────────────

class LocalStorageService implements StorageService {
  private basePath: string

  constructor() {
    this.basePath = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_PATH ?? "./storage")
  }

  private fullPath(key: string): string {
    // Sanitize key to prevent path traversal
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "")
    return path.join(this.basePath, safe)
  }

  async save(buffer: Buffer, key: string): Promise<string> {
    const fp = this.fullPath(key)
    await fs.mkdir(path.dirname(fp), { recursive: true })
    await fs.writeFile(fp, buffer)
    return fp
  }

  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(storagePath)
  }

  async delete(storagePath: string): Promise<void> {
    await fs.unlink(storagePath).catch(() => {
      // Ignore if file already gone
    })
  }

  async exists(storagePath: string): Promise<boolean> {
    return fs
      .access(storagePath)
      .then(() => true)
      .catch(() => false)
  }
}

// ─── Factory & key helpers ────────────────────────────────────────────────────

let instance: StorageService | null = null

export function getStorageService(): StorageService {
  if (!instance) {
    const provider = process.env.STORAGE_PROVIDER ?? "local"
    if (provider === "local") {
      instance = new LocalStorageService()
    } else {
      // S3 implementation goes here in Phase 2
      throw new Error(`Storage provider "${provider}" is not yet implemented`)
    }
  }
  return instance
}

/** Generates the storage key for a raw import file. */
export function rawFileKey(userId: string, fileHash: string): string {
  return `raw/${userId}/${fileHash}.xml`
}
