ALTER TABLE "DriverProfile" ADD COLUMN "onboardingDone" BOOLEAN NOT NULL DEFAULT false;
-- Mark existing users who have sessions as done
UPDATE "DriverProfile" SET "onboardingDone" = true
WHERE "userId" IN (SELECT DISTINCT "userId" FROM "Session" WHERE "deletedAt" IS NULL);
