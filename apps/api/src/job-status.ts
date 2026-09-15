import type { JobStatus, Prisma } from './generated/prisma/client'

/** Work still in play: waiting for a technician, or held by one. */
export const ACTIVE_JOB_STATUSES = ['OPEN', 'ASSIGNED'] as const satisfies readonly JobStatus[]

/** Finished work, kept as history. Closed jobs can't be assigned or unassigned. */
export const CLOSED_JOB_STATUSES = ['COMPLETED', 'CANCELLED'] as const satisfies readonly JobStatus[]

export function isClosedJobStatus(status: JobStatus): boolean {
  return (CLOSED_JOB_STATUSES as readonly JobStatus[]).includes(status)
}

/** Jobs waiting for a technician: the dispatch queue. */
export const openJobWhere = { status: 'OPEN', technicianId: null } satisfies Prisma.JobWhereInput

/** Jobs a technician currently holds: their workload. Add `technicianId` to scope it to one technician. */
export const assignedJobWhere = { status: 'ASSIGNED' } satisfies Prisma.JobWhereInput

/** Open and assigned jobs, leaving out closed history. */
export const activeJobWhere = { status: { in: [...ACTIVE_JOB_STATUSES] } } satisfies Prisma.JobWhereInput
