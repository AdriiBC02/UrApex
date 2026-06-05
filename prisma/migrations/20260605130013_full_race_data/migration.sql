-- AlterTable
ALTER TABLE "PitStop" ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "participantId" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "humidity" DOUBLE PRECISION,
ADD COLUMN     "trackLengthM" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SessionParticipant" ADD COLUMN     "finishStatus" TEXT,
ADD COLUMN     "pitStopsCount" INTEGER;

-- CreateTable
CREATE TABLE "ParticipantLap" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "lapNumber" INTEGER NOT NULL,
    "lapTimeMs" INTEGER,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "sector1Ms" INTEGER,
    "sector2Ms" INTEGER,
    "sector3Ms" INTEGER,
    "fuelLoad" DOUBLE PRECISION,
    "tyreCompound" TEXT,

    CONSTRAINT "ParticipantLap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipantLap_participantId_idx" ON "ParticipantLap"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantLap_participantId_lapNumber_key" ON "ParticipantLap"("participantId", "lapNumber");

-- CreateIndex
CREATE INDEX "PitStop_participantId_idx" ON "PitStop"("participantId");

-- AddForeignKey
ALTER TABLE "ParticipantLap" ADD CONSTRAINT "ParticipantLap_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SessionParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitStop" ADD CONSTRAINT "PitStop_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SessionParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
