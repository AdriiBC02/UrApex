"use client"

import { useState } from "react"
import { UploadZone } from "./UploadZone"
import { PostSessionModal } from "./PostSessionModal"

export function UploadPageClient() {
  const [postSessionId, setPostSessionId] = useState<string | null>(null)

  return (
    <>
      <UploadZone onImported={(id) => setPostSessionId(id)} />
      <PostSessionModal
        sessionId={postSessionId}
        onClose={() => setPostSessionId(null)}
      />
    </>
  )
}
