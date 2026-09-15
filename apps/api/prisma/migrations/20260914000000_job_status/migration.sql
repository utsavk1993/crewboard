-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED');

-- AlterTable: nullable until existing rows are backfilled below.
ALTER TABLE "jobs" ADD COLUMN "status" "JobStatus",
ADD COLUMN "completed_at" TIMESTAMP(3);

-- Backfill: existing jobs have no history yet, so a job with a technician is assigned and the rest are open.
UPDATE "jobs" SET "status" = CASE WHEN "technician_id" IS NULL THEN 'OPEN'::"JobStatus" ELSE 'ASSIGNED'::"JobStatus" END;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "status" SET NOT NULL;
