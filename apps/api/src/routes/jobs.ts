import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, validate } from '../errors'
import type { Prisma } from '../generated/prisma/client'
import { activeJobWhere, assignedJobWhere, isClosedJobStatus, openJobWhere } from '../job-status'
import { locationSelect, toLocation } from '../locations'
import { skillSelect } from '../skills'
import { changeActiveJobCount } from '../workload-counter'

export const jobsRouter = Router()

const jobSelect = {
  id: true,
  title: true,
  description: true,
  customerName: true,
  address: true,
  city: { select: locationSelect },
  skill: { select: skillSelect },
  priority: true,
  scheduledDate: true,
  status: true,
  technicianId: true,
  assignedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobSelect

type JobRow = Prisma.JobGetPayload<{ select: typeof jobSelect }>

// `requiredSkill` repeats the specialty name for clients that only read names.
function toJob({ city, skill, ...job }: JobRow) {
  return { ...job, location: toLocation(city), requiredSkill: skill.name, skill }
}

const listQuerySchema = z
  .object({
    unassigned: z.literal('true', { error: 'unassigned must be "true" when provided.' }).optional(),
    technicianId: z.uuid({ error: 'technicianId must be a valid UUID.' }).optional(),
  })
  .refine((query) => !(query.unassigned && query.technicianId), {
    error: 'Use either unassigned or technicianId, not both.',
  })

const jobParamsSchema = z.object({
  id: z.uuid({ error: 'Job id must be a valid UUID.' }),
})

const assignmentBodySchema = z.object(
  { technicianId: z.uuid({ error: 'technicianId must be a valid UUID or null.' }).nullable() },
  { error: 'Request body must be a JSON object like { "technicianId": "<uuid>" | null }.' },
)

// Closed jobs are history, so the list holds only active work; filters narrow it to the queue or one workload.
function listWhere({ unassigned, technicianId }: z.infer<typeof listQuerySchema>): Prisma.JobWhereInput {
  if (unassigned) return openJobWhere
  if (technicianId) return { ...assignedJobWhere, technicianId }
  return activeJobWhere
}

jobsRouter.get('/', async (req, res) => {
  const query = validate(listQuerySchema, req.query)

  const jobs = await prisma.job.findMany({
    where: listWhere(query),
    orderBy: [{ scheduledDate: 'asc' }, { priority: 'desc' }, { title: 'asc' }, { id: 'asc' }],
    select: jobSelect,
  })

  res.json(jobs.map(toJob))
})

jobsRouter.patch('/:id/assignment', async (req, res) => {
  const { id } = validate(jobParamsSchema, req.params)
  const { technicianId } = validate(assignmentBodySchema, req.body)

  const job = technicianId === null ? await unassignJob(id) : await assignJob(id, technicianId)
  res.json(job)
})

const jobNotFound = () => new HttpError(404, 'JOB_NOT_FOUND', 'Job not found.')

const jobClosed = (action: 'assigned' | 'unassigned') =>
  new HttpError(409, 'JOB_CLOSED', `This job is closed and can't be ${action}.`)

async function assignJob(jobId: string, technicianId: string) {
  const [job, technician] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId }, select: { id: true } }),
    prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true } }),
  ])
  if (!job) throw jobNotFound()
  if (!technician) throw new HttpError(404, 'TECHNICIAN_NOT_FOUND', 'Technician not found.')

  const assigned = await prisma.$transaction(async (tx) => {
    // Conditional update: only one of two concurrent assignments can match an open job, and closed jobs never match.
    const { count } = await tx.job.updateMany({
      where: { id: jobId, ...openJobWhere },
      data: { status: 'ASSIGNED', technicianId, assignedAt: new Date() },
    })
    // Only the assignment that actually took the job moves the counter, and both commit together.
    if (count === 1) await changeActiveJobCount(tx, technicianId, 1)
    return count === 1
  })

  if (!assigned) {
    const current = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true, technicianId: true } })
    if (!current) throw jobNotFound()
    if (isClosedJobStatus(current.status)) throw jobClosed('assigned')
    throw new HttpError(
      409,
      'JOB_ALREADY_ASSIGNED',
      current.technicianId === technicianId
        ? 'This job is already assigned to this technician.'
        : 'This job is already assigned to another technician.',
    )
  }

  return toJob(await prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect }))
}

async function unassignJob(jobId: string): Promise<ReturnType<typeof toJob>> {
  const current = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true, technicianId: true } })
  if (!current) throw jobNotFound()
  if (isClosedJobStatus(current.status)) throw jobClosed('unassigned')

  const holder = current.status === 'ASSIGNED' ? current.technicianId : null
  if (holder) {
    const released = await prisma.$transaction(async (tx) => {
      // Conditional update, like assigning, but also on the holder read above: the job only goes back to open
      // if that technician still holds it, so their counter is the one that drops, in the same commit.
      const { count } = await tx.job.updateMany({
        where: { id: jobId, ...assignedJobWhere, technicianId: holder },
        data: { status: 'OPEN', technicianId: null, assignedAt: null },
      })
      if (count === 1) await changeActiveJobCount(tx, holder, -1)
      return count === 1
    })
    // Another request changed the job after it was read (unassigned, reassigned or closed it): decide again from its new state.
    if (!released) return unassignJob(jobId)
  }
  // Otherwise the job is open, and unassigning it is an idempotent no-op.

  return toJob(await prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect }))
}
