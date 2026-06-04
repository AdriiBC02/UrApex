-- CreateTable
CREATE TABLE "SessionInsight" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionInsight_sessionId_idx" ON "SessionInsight"("sessionId");

-- AddForeignKey
ALTER TABLE "SessionInsight" ADD CONSTRAINT "SessionInsight_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
