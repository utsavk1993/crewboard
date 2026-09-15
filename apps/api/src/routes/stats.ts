import { Router } from 'express'
import { prisma } from '../db'

export const statsRouter = Router()

/** A technician is at a heavy workload from this many assigned jobs, matching the dashboard's workload levels. */
const HEAVY_WORKLOAD_MIN_JOBS = 5

interface StatsRow {
  technicians: number
  available: number
  heavy: number
  assigned: number
  unassigned: number
  urgentUnassigned: number
}

/**
 * Every number the dashboard shows, as one round trip of six indexed counts.
 *
 * Each count is a scalar subquery restricted to an index range, so none of them reads a full table:
 * the technician counts scan `(active_job_count, name, id)` (the stored counter, never a recount of jobs),
 * the assigned and unassigned counts scan `(status, technician_id)`, and the urgent count scans the same
 * `status = 'OPEN'` slice. The `::int` casts keep `count(*)` from arriving as a BigInt, which JSON can't serialize.
 */
function queryStats() {
  return prisma.$queryRaw<[StatsRow]>`
    SELECT
      (SELECT count(*) FROM technicians)::int AS "technicians",
      (SELECT count(*) FROM technicians WHERE active_job_count = 0)::int AS "available",
      (SELECT count(*) FROM technicians WHERE active_job_count >= ${HEAVY_WORKLOAD_MIN_JOBS}::int)::int AS "heavy",
      (SELECT count(*) FROM jobs WHERE status = 'ASSIGNED')::int AS "assigned",
      (SELECT count(*) FROM jobs WHERE status = 'OPEN' AND technician_id IS NULL)::int AS "unassigned",
      (SELECT count(*) FROM jobs WHERE status = 'OPEN' AND technician_id IS NULL AND priority = 'URGENT')::int
        AS "urgentUnassigned"
  `
}

statsRouter.get('/', async (_req, res) => {
  const [{ technicians, available, heavy, assigned, unassigned, urgentUnassigned }] = await queryStats()

  res.json({
    technicians: { total: technicians, available, heavy },
    jobs: {
      assigned,
      unassigned,
      urgentUnassigned,
      // One decimal, and 0 rather than a division by zero when there are no technicians.
      averagePerTechnician: technicians === 0 ? 0 : Math.round((assigned / technicians) * 10) / 10,
    },
  })
})
