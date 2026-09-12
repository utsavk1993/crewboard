import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, validate } from '../errors'
import type { Prisma } from '../generated/prisma/client'

export const jobsRouter = Router()

const jobSelect = {
  id: true,
  title: true,
  description: true,
  customerName: true,
  address: true,
  requiredSkill: true,
  priority: true,
  scheduledDate: true,
  technicianId: true,
  assignedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobSelect

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

jobsRouter.get('/', async (req, res) => {
  const query = validate(listQuerySchema, req.query)

  const jobs = await prisma.job.findMany({
    where: query.unassigned ? { technicianId: null } : query.technicianId ? { technicianId: query.technicianId } : {},
    orderBy: [{ scheduledDate: 'asc' }, { priority: 'desc' }, { title: 'asc' }, { id: 'asc' }],
    select: jobSelect,
  })

  res.json(jobs)
})

jobsRouter.patch('/:id/assignment', async (req, res) => {
  const { id } = validate(jobParamsSchema, req.params)
  const { technicianId } = validate(assignmentBodySchema, req.body)

  const job = technicianId === null ? await unassignJob(id) : await assignJob(id, technicianId)
  res.json(job)
})

const jobNotFound = () => new HttpError(404, 'JOB_NOT_FOUND', 'Job not found.')

async function assignJob(jobId: string, technicianId: string) {
  const [job, technician] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId }, select: { id: true } }),
    prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true } }),
  ])
  if (!job) throw jobNotFound()
  if (!technician) throw new HttpError(404, 'TECHNICIAN_NOT_FOUND', 'Technician not found.')

  // Conditional update: only one of two concurrent assignments can match `technicianId: null`.
  const { count } = await prisma.job.updateMany({
    where: { id: jobId, technicianId: null },
    data: { technicianId, assignedAt: new Date() },
  })

  if (count === 0) {
    const current = await prisma.job.findUnique({ where: { id: jobId }, select: { technicianId: true } })
    if (!current) throw jobNotFound()
    throw new HttpError(
      409,
      'JOB_ALREADY_ASSIGNED',
      current.technicianId === technicianId
        ? 'This job is already assigned to this technician.'
        : 'This job is already assigned to another technician.',
    )
  }

  return prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect })
}

async function unassignJob(jobId: string) {
  // Idempotent: unassigning an unassigned job succeeds.
  const { count } = await prisma.job.updateMany({
    where: { id: jobId },
    data: { technicianId: null, assignedAt: null },
  })
  if (count === 0) throw jobNotFound()

  return prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: jobSelect })
}
