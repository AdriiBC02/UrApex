-- CreateTable
CREATE TABLE "TelemetryRecording" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "frames" JSONB NOT NULL,
    "totalFrames" INTEGER,
    "sampleHz" DOUBLE PRECISION DEFAULT 10.0,
    "durationSec" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryRecording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelemetryRecording_sessionId_key" ON "TelemetryRecording"("sessionId");

-- CreateIndex
CREATE INDEX "TelemetryRecording_sessionId_idx" ON "TelemetryRecording"("sessionId");

-- AddForeignKey
ALTER TABLE "TelemetryRecording" ADD CONSTRAINT "TelemetryRecording_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
