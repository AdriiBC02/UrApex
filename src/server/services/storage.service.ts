import fs from "fs/promises"
import path from "path"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"

export interface StorageService {
  save(buffer: Buffer, key: string): Promise<string>
  read(storagePath: string): Promise<Buffer>
  delete(storagePath: string): Promise<void>
  exists(storagePath: string): Promise<boolean>
}

// ─── Local filesystem (dev) ───────────────────────────────────────────────────

class LocalStorageService implements StorageService {
  private basePath: string

  constructor() {
    this.basePath = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_PATH ?? "./storage")
  }

  private fullPath(key: string): string {
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
    await fs.unlink(storagePath).catch(() => {})
  }

  async exists(storagePath: string): Promise<boolean> {
    return fs.access(storagePath).then(() => true).catch(() => false)
  }
}

// ─── S3-compatible (Cloudflare R2 / AWS S3) ──────────────────────────────────

class S3StorageService implements StorageService {
  private client: S3Client
  private bucket: string

  constructor() {
    const bucket   = process.env.S3_BUCKET
    const region   = process.env.S3_REGION   ?? "auto"
    const endpoint = process.env.S3_ENDPOINT
    const accessKeyId     = process.env.S3_ACCESS_KEY
    const secretAccessKey = process.env.S3_SECRET_KEY

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("S3 storage requires S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY")
    }

    this.bucket = bucket
    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      // R2 requires path-style addressing
      forcePathStyle: !!endpoint,
    })
  }

  async save(buffer: Buffer, key: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: "text/xml",
    }))
    return key
  }

  async read(storagePath: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    }))
    const bytes = await res.Body!.transformToByteArray()
    return Buffer.from(bytes)
  }

  async delete(storagePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    }))
  }

  async exists(storagePath: string): Promise<boolean> {
    return this.client
      .send(new HeadObjectCommand({ Bucket: this.bucket, Key: storagePath }))
      .then(() => true)
      .catch(() => false)
  }
}

// ─── Factory & key helpers ────────────────────────────────────────────────────

let instance: StorageService | null = null

export function getStorageService(): StorageService {
  if (!instance) {
    const provider = process.env.STORAGE_PROVIDER ?? "local"
    if (provider === "s3") {
      instance = new S3StorageService()
    } else {
      instance = new LocalStorageService()
    }
  }
  return instance
}

export function rawFileKey(userId: string, fileHash: string): string {
  return `raw/${userId}/${fileHash}.xml`
}
