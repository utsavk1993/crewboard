-- CreateTable
CREATE TABLE "provinces" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "province_code" TEXT NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" UUID NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "provinces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_province_code_name_key" ON "regions"("province_code", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_region_id_name_key" ON "cities"("region_id", "name");

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: existing technicians and jobs have no real location, so they all move to the head office city.
INSERT INTO "provinces" ("code", "name") VALUES ('BC', 'British Columbia');

INSERT INTO "regions" ("id", "name", "province_code") VALUES (gen_random_uuid(), 'Metro Vancouver', 'BC');

INSERT INTO "cities" ("id", "name", "region_id")
SELECT gen_random_uuid(), 'Vancouver', "id"
FROM "regions"
WHERE "province_code" = 'BC' AND "name" = 'Metro Vancouver';

-- AlterTable: nullable until existing rows are backfilled below.
ALTER TABLE "technicians" ADD COLUMN "city_id" UUID;

-- AlterTable: nullable until existing rows are backfilled below.
ALTER TABLE "jobs" ADD COLUMN "city_id" UUID;

UPDATE "technicians" SET "city_id" = (SELECT "id" FROM "cities" WHERE "name" = 'Vancouver');

UPDATE "jobs" SET "city_id" = (SELECT "id" FROM "cities" WHERE "name" = 'Vancouver');

-- AlterTable
ALTER TABLE "technicians" ALTER COLUMN "city_id" SET NOT NULL,
DROP COLUMN "region";

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "city_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "technicians_city_id_idx" ON "technicians"("city_id");

-- CreateIndex
CREATE INDEX "jobs_city_id_idx" ON "jobs"("city_id");

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
