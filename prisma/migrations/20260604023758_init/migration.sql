-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PARSING', 'IMPORTED', 'FAILED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('PRACTICE', 'QUALIFYING', 'RACE', 'HOTLAP', 'TIME_TRIAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('BEST_LAP_TIME', 'CONSISTENCY_SCORE', 'CLEAN_LAP_COUNT', 'SESSION_COUNT', 'HOURS_DRIVEN', 'REDUCE_INCIDENTS', 'IMPROVE_SAFETY', 'COMPLETE_STINTS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "country" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "simulatorSlugs" TEXT[],
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalLaps" INTEGER NOT NULL DEFAULT 0,
    "totalDriveTimeSec" INTEGER NOT NULL DEFAULT 0,
    "uniqueTracks" INTEGER NOT NULL DEFAULT 0,
    "uniqueCars" INTEGER NOT NULL DEFAULT 0,
    "paceScore" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "safetyScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Simulator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulatorId" TEXT,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "parserVersion" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importFileId" TEXT,
    "simulatorId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "trackLayoutId" TEXT,
    "carId" TEXT NOT NULL,
    "carClassId" TEXT,
    "sessionType" "SessionType" NOT NULL,
    "sessionName" TEXT,
    "serverName" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "durationSec" INTEGER,
    "finalPosition" INTEGER,
    "totalLaps" INTEGER NOT NULL DEFAULT 0,
    "validLaps" INTEGER NOT NULL DEFAULT 0,
    "invalidLaps" INTEGER NOT NULL DEFAULT 0,
    "dnf" BOOLEAN NOT NULL DEFAULT false,
    "dq" BOOLEAN NOT NULL DEFAULT false,
    "weather" TEXT,
    "tempAmbient" DOUBLE PRECISION,
    "tempTrack" DOUBLE PRECISION,
    "tyreCompound" TEXT,
    "bestLapMs" INTEGER,
    "avgLapMs" DOUBLE PRECISION,
    "medianLapMs" DOUBLE PRECISION,
    "idealLapMs" INTEGER,
    "stdDevMs" DOUBLE PRECISION,
    "cleanLapRatio" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "safetyScore" DOUBLE PRECISION,
    "paceScore" DOUBLE PRECISION,
    "dropOffMs" DOUBLE PRECISION,
    "isNewPB" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lap" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lapNumber" INTEGER NOT NULL,
    "lapTimeMs" INTEGER,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "isPersonalBest" BOOLEAN NOT NULL DEFAULT false,
    "isSessionBest" BOOLEAN NOT NULL DEFAULT false,
    "sector1Ms" INTEGER,
    "sector2Ms" INTEGER,
    "sector3Ms" INTEGER,
    "fuelLoad" DOUBLE PRECISION,
    "tyreCompound" TEXT,

    CONSTRAINT "Lap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "lengthM" DOUBLE PRECISION,
    "timezone" TEXT,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackLayout" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthM" DOUBLE PRECISION,

    CONSTRAINT "TrackLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackAlias" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,

    CONSTRAINT "TrackAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "year" INTEGER,
    "simulatorId" TEXT,
    "classId" TEXT,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarAlias" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,

    CONSTRAINT "CarAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarClass" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "simulatorId" TEXT,

    CONSTRAINT "CarClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "teamName" TEXT,
    "carName" TEXT,
    "carClass" TEXT,
    "position" INTEGER,
    "lapsCompleted" INTEGER,
    "bestLapMs" INTEGER,
    "totalTimeMs" BIGINT,
    "gapToLeaderMs" BIGINT,
    "dnf" BOOLEAN NOT NULL DEFAULT false,
    "dq" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lapNumber" INTEGER,
    "type" TEXT,
    "description" TEXT,
    "severity" INTEGER,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penalty" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lapNumber" INTEGER,
    "type" TEXT,
    "description" TEXT,
    "timeSec" DOUBLE PRECISION,

    CONSTRAINT "Penalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitStop" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lapNumber" INTEGER,
    "durationMs" INTEGER,
    "fuelAdded" DOUBLE PRECISION,
    "tyreChange" BOOLEAN NOT NULL DEFAULT false,
    "tyreCompound" TEXT,

    CONSTRAINT "PitStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionNote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,
    "carId" TEXT,
    "trackId" TEXT,
    "name" TEXT NOT NULL,
    "conditions" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isObsolete" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupVersion" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storagePath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSetup" (
    "sessionId" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,

    CONSTRAINT "SessionSetup_pkey" PRIMARY KEY ("sessionId","setupId")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GoalType" NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "simulatorId" TEXT,
    "trackId" TEXT,
    "carId" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "deadline" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" "AchievementRarity" NOT NULL,
    "icon" TEXT,
    "condition" JSONB NOT NULL,
    "maxProgress" DOUBLE PRECISION NOT NULL DEFAULT 100,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionToken_key" ON "AuthSession"("sessionToken");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Simulator_slug_key" ON "Simulator"("slug");

-- CreateIndex
CREATE INDEX "Simulator_slug_idx" ON "Simulator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ImportFile_fileHash_key" ON "ImportFile"("fileHash");

-- CreateIndex
CREATE INDEX "ImportFile_userId_idx" ON "ImportFile"("userId");

-- CreateIndex
CREATE INDEX "ImportFile_fileHash_idx" ON "ImportFile"("fileHash");

-- CreateIndex
CREATE INDEX "ImportFile_status_idx" ON "ImportFile"("status");

-- CreateIndex
CREATE INDEX "ImportFile_userId_status_idx" ON "ImportFile"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_importFileId_key" ON "Session"("importFileId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_trackId_idx" ON "Session"("trackId");

-- CreateIndex
CREATE INDEX "Session_carId_idx" ON "Session"("carId");

-- CreateIndex
CREATE INDEX "Session_sessionDate_idx" ON "Session"("sessionDate");

-- CreateIndex
CREATE INDEX "Session_sessionType_idx" ON "Session"("sessionType");

-- CreateIndex
CREATE INDEX "Session_simulatorId_idx" ON "Session"("simulatorId");

-- CreateIndex
CREATE INDEX "Session_userId_sessionDate_idx" ON "Session"("userId", "sessionDate");

-- CreateIndex
CREATE INDEX "Session_userId_trackId_idx" ON "Session"("userId", "trackId");

-- CreateIndex
CREATE INDEX "Session_userId_carId_idx" ON "Session"("userId", "carId");

-- CreateIndex
CREATE INDEX "Lap_sessionId_idx" ON "Lap"("sessionId");

-- CreateIndex
CREATE INDEX "Lap_sessionId_isValid_idx" ON "Lap"("sessionId", "isValid");

-- CreateIndex
CREATE UNIQUE INDEX "Lap_sessionId_lapNumber_key" ON "Lap"("sessionId", "lapNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Track_slug_key" ON "Track"("slug");

-- CreateIndex
CREATE INDEX "Track_slug_idx" ON "Track"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TrackLayout_trackId_name_key" ON "TrackLayout"("trackId", "name");

-- CreateIndex
CREATE INDEX "TrackAlias_trackId_idx" ON "TrackAlias"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackAlias_rawName_simulatorId_key" ON "TrackAlias"("rawName", "simulatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_slug_key" ON "Car"("slug");

-- CreateIndex
CREATE INDEX "Car_slug_idx" ON "Car"("slug");

-- CreateIndex
CREATE INDEX "Car_classId_idx" ON "Car"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "CarAlias_rawName_simulatorId_key" ON "CarAlias"("rawName", "simulatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CarClass_slug_simulatorId_key" ON "CarClass"("slug", "simulatorId");

-- CreateIndex
CREATE INDEX "SessionParticipant_sessionId_idx" ON "SessionParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "Incident_sessionId_idx" ON "Incident"("sessionId");

-- CreateIndex
CREATE INDEX "Penalty_sessionId_idx" ON "Penalty"("sessionId");

-- CreateIndex
CREATE INDEX "PitStop_sessionId_idx" ON "PitStop"("sessionId");

-- CreateIndex
CREATE INDEX "Setup_userId_idx" ON "Setup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SetupVersion_setupId_version_key" ON "SetupVersion"("setupId", "version");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFile" ADD CONSTRAINT "ImportFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFile" ADD CONSTRAINT "ImportFile_simulatorId_fkey" FOREIGN KEY ("simulatorId") REFERENCES "Simulator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_importFileId_fkey" FOREIGN KEY ("importFileId") REFERENCES "ImportFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_simulatorId_fkey" FOREIGN KEY ("simulatorId") REFERENCES "Simulator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_trackLayoutId_fkey" FOREIGN KEY ("trackLayoutId") REFERENCES "TrackLayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_carClassId_fkey" FOREIGN KEY ("carClassId") REFERENCES "CarClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLayout" ADD CONSTRAINT "TrackLayout_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackAlias" ADD CONSTRAINT "TrackAlias_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_simulatorId_fkey" FOREIGN KEY ("simulatorId") REFERENCES "Simulator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CarClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarAlias" ADD CONSTRAINT "CarAlias_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalty" ADD CONSTRAINT "Penalty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitStop" ADD CONSTRAINT "PitStop_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setup" ADD CONSTRAINT "Setup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupVersion" ADD CONSTRAINT "SetupVersion_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSetup" ADD CONSTRAINT "SessionSetup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSetup" ADD CONSTRAINT "SessionSetup_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
