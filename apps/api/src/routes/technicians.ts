import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, validate } from '../errors'
import type { Prisma } from '../generated/prisma/client'
import { locationSelect, toLocation } from '../locations'
import { skillSelect } from '../skills'

export const techniciansRouter = Router()

const technicianSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  designation: true,
  hiredOn: true,
  city: { select: locationSelect },
  skills: {
    select: { skill: { select: skillSelect } },
    orderBy: [{ skill: { category: { name: 'asc' } } }, { skill: { name: 'asc' } }],
  },
  // Stored counter of ASSIGNED jobs, so completed and cancelled history never counts and no per-row count query runs.
  activeJobCount: true,
} satisfies Prisma.TechnicianSelect

type TechnicianRow = Prisma.TechnicianGetPayload<{ select: typeof technicianSelect }>

// `skills` lists the same specialties by name, in the same order, for clients that only read names.
// `region` is the home base city name, for clients that still read the old free-text field.
function toTechnician({ city, skills, activeJobCount, ...technician }: TechnicianRow) {
  const specialties = skills.map(({ skill }) => skill)
  return {
    ...technician,
    region: city.name,
    location: toLocation(city),
    skills: specialties.map(({ name }) => name),
    specialties,
    assignedJobCount: activeJobCount,
  }
}

const technicianParamsSchema = z.object({
  id: z.uuid({ error: 'Technician id must be a valid UUID.' }),
})

techniciansRouter.get('/', async (_req, res) => {
  const technicians = await prisma.technician.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: technicianSelect,
  })

  res.json(technicians.map(toTechnician))
})

// Routes on literal sub-paths must be registered above this one, or `:id` captures them.
techniciansRouter.get('/:id', async (req, res) => {
  const { id } = validate(technicianParamsSchema, req.params)

  const technician = await prisma.technician.findUnique({ where: { id }, select: technicianSelect })
  if (!technician) throw new HttpError(404, 'TECHNICIAN_NOT_FOUND', 'Technician not found.')

  res.json(toTechnician(technician))
})
