import type { Prisma } from './generated/prisma/client'

type Db = Pick<Prisma.TransactionClient, '$executeRaw'>

/**
 * Recomputes every technician's `activeJobCount` from their ASSIGNED jobs, zeroing technicians without any.
 * Run it after writing jobs in bulk (seeds, fixtures); the API keeps counters exact on its own.
 * Returns a PrismaPromise, so it can run inside a batch `$transaction([...])`. Resolves to the number of rows changed.
 */
export function recomputeActiveJobCounts(db: Db): Prisma.PrismaPromise<number> {
  return db.$executeRaw`
    UPDATE technicians AS t
    SET active_job_count = counts.active_job_count
    FROM (
      SELECT technicians.id, count(jobs.id)::int AS active_job_count
      FROM technicians
      LEFT JOIN jobs ON jobs.technician_id = technicians.id AND jobs.status = 'ASSIGNED'
      GROUP BY technicians.id
    ) AS counts
    WHERE counts.id = t.id AND t.active_job_count <> counts.active_job_count
  `
}

/** Moves one technician's counter by `delta`. Call it in the same transaction as the job update that caused it. */
export async function changeActiveJobCount(tx: Prisma.TransactionClient, technicianId: string, delta: 1 | -1) {
  await tx.technician.update({
    where: { id: technicianId },
    data: { activeJobCount: { increment: delta } },
    select: { id: true },
  })
}
