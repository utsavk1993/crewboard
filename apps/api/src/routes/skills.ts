import { Router } from 'express'
import { prisma } from '../db'
import type { Prisma } from '../generated/prisma/client'

export const skillsRouter = Router()

const categorySelect = {
  id: true,
  name: true,
  skills: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.SkillCategorySelect

type CategoryRow = Prisma.SkillCategoryGetPayload<{ select: typeof categorySelect }>

// The taxonomy calls a skill row a specialty, the way technicians and jobs do.
function toCategory({ skills, ...category }: CategoryRow) {
  return { ...category, specialties: skills }
}

// Category and specialty names are both unique, so ordering by name alone is stable.
skillsRouter.get('/', async (_req, res) => {
  const categories = await prisma.skillCategory.findMany({ orderBy: { name: 'asc' }, select: categorySelect })

  res.json({ categories: categories.map(toCategory) })
})
