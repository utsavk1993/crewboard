import type { Prisma } from './generated/prisma/client'

/** The API shape of a specialty: `{ id, name, category: { id, name } }`. */
export const skillSelect = {
  id: true,
  name: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.SkillSelect
