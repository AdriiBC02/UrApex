import crypto from "crypto"

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

export function sha256String(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex")
}
