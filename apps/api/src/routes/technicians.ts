import { Router } from 'express'
import { prisma } from '../db'
import type { Prisma } from '../generated/prisma/client'
import { skillSelect } from '../skills'

export const techniciansRouter = Router()

const technicianSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  designation: true,
  region: true,
  skills: {
    select: { skill: { select: skillSelect } },
    orderBy: [{ skill: { category: { name: 'asc' } } }, { skill: { name: 'asc' } }],
  },
  _count: { select: { jobs: true } },
} satisfies Prisma.TechnicianSelect

type TechnicianRow = Prisma.TechnicianGetPayload<{ select: typeof technicianSelect }>

// `skills` lists the same specialties by name, in the same order, for clients that only read names.
function toTechnician({ skills, _count, ...technician }: TechnicianRow) {
  const specialties = skills.map(({ skill }) => skill)
  return {
    ...technician,
    skills: specialties.map(({ name }) => name),
    specialties,
    assignedJobCount: _count.jobs,
  }
}

techniciansRouter.get('/', async (_req, res) => {
  const technicians = await prisma.technician.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: technicianSelect,
  })

  res.json(technicians.map(toTechnician))
})
