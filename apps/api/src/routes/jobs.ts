import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { validate } from '../errors'
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

jobsRouter.get('/', async (req, res) => {
  const query = validate(listQuerySchema, req.query)

  const jobs = await prisma.job.findMany({
    where: query.unassigned ? { technicianId: null } : query.technicianId ? { technicianId: query.technicianId } : {},
    orderBy: [{ scheduledDate: 'asc' }, { priority: 'desc' }, { title: 'asc' }, { id: 'asc' }],
    select: jobSelect,
  })

  res.json(jobs)
})
