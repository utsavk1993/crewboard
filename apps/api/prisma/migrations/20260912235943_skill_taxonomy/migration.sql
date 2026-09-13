-- CreateTable
CREATE TABLE "skill_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_skills" (
    "technician_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "technician_skills_pkey" PRIMARY KEY ("technician_id","skill_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_name_key" ON "skill_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_category_id_idx" ON "skills"("category_id");

-- CreateIndex
CREATE INDEX "technician_skills_skill_id_idx" ON "technician_skills"("skill_id");

-- AlterTable: nullable until existing jobs are backfilled below.
ALTER TABLE "jobs" ADD COLUMN "skill_id" UUID;

-- CreateIndex
CREATE INDEX "jobs_skill_id_idx" ON "jobs"("skill_id");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing skill string becomes a category with a single "General <category>" specialty,
-- so existing technicians and jobs keep an equivalent skill. Skill names are globally unique, hence the prefix.
INSERT INTO "skill_categories" ("id", "name")
SELECT gen_random_uuid(), "legacy"."name"
FROM (
    SELECT unnest("skills") AS "name" FROM "technicians"
    UNION
    SELECT "required_skill" FROM "jobs"
) AS "legacy"
WHERE "legacy"."name" IS NOT NULL;

INSERT INTO "skills" ("id", "name", "category_id")
SELECT gen_random_uuid(), 'General ' || "name", "id"
FROM "skill_categories";

INSERT INTO "technician_skills" ("technician_id", "skill_id")
SELECT DISTINCT "technicians"."id", "skills"."id"
FROM "technicians"
CROSS JOIN LATERAL unnest("technicians"."skills") AS "legacy"("name")
JOIN "skill_categories" ON "skill_categories"."name" = "legacy"."name"
JOIN "skills" ON "skills"."category_id" = "skill_categories"."id";

UPDATE "jobs"
SET "skill_id" = "skills"."id"
FROM "skills"
JOIN "skill_categories" ON "skill_categories"."id" = "skills"."category_id"
WHERE "skill_categories"."name" = "jobs"."required_skill";

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "skill_id" SET NOT NULL,
DROP COLUMN "required_skill";

-- AlterTable
ALTER TABLE "technicians" DROP COLUMN "skills";
