-- AlterTable: nullable until existing rows are backfilled below.
ALTER TABLE "technicians" ADD COLUMN "hired_on" DATE;

-- Backfill: existing technicians have no recorded hire date, so use the day their record was created.
UPDATE "technicians" SET "hired_on" = "created_at"::date;

-- AlterTable
ALTER TABLE "technicians" ALTER COLUMN "hired_on" SET NOT NULL;
