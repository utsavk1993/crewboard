import { Router } from 'express'
import { prisma } from '../db'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok' })
})
