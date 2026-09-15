-- Trigram operator classes for substring search indexes. Ships with Postgres contrib.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex: covered by the (skill_id, status) and (city_id, status) indexes below.
DROP INDEX "jobs_city_id_idx";

-- DropIndex
DROP INDEX "jobs_skill_id_idx";

-- AlterTable
ALTER TABLE "technicians" ADD COLUMN     "active_job_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill: every technician starts at 0, so only those holding assigned jobs need an update.
UPDATE "technicians" AS t
SET "active_job_count" = held."count"
FROM (
  SELECT "technician_id", count(*)::int AS "count"
  FROM "jobs"
  WHERE "status" = 'ASSIGNED' AND "technician_id" IS NOT NULL
  GROUP BY "technician_id"
) AS held
WHERE held."technician_id" = t."id";

-- CreateIndex
CREATE INDEX "jobs_status_technician_id_idx" ON "jobs"("status", "technician_id");

-- CreateIndex
CREATE INDEX "jobs_status_scheduled_date_priority_idx" ON "jobs"("status", "scheduled_date", "priority");

-- CreateIndex
CREATE INDEX "jobs_skill_id_status_idx" ON "jobs"("skill_id", "status");

-- CreateIndex
CREATE INDEX "jobs_city_id_status_idx" ON "jobs"("city_id", "status");

-- CreateIndex
CREATE INDEX "jobs_title_trgm_idx" ON "jobs" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "jobs_customer_name_trgm_idx" ON "jobs" USING GIN ("customer_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "technicians_name_id_idx" ON "technicians"("name", "id");

-- CreateIndex
CREATE INDEX "technicians_active_job_count_name_id_idx" ON "technicians"("active_job_count", "name", "id");

-- CreateIndex
CREATE INDEX "technicians_name_trgm_idx" ON "technicians" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "technicians_email_trgm_idx" ON "technicians" USING GIN ("email" gin_trgm_ops);
