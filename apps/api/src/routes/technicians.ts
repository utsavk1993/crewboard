import { Router } from 'express'
import { prisma } from '../db'

export const techniciansRouter = Router()

techniciansRouter.get('/', async (_req, res) => {
  const technicians = await prisma.technician.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      designation: true,
      region: true,
      skills: true,
      _count: { select: { jobs: true } },
    },
  })

  res.json(technicians.map(({ _count, ...technician }) => ({ ...technician, assignedJobCount: _count.jobs })))
})
