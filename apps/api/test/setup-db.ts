import { prisma } from '../src/db'
import { resetDatabase } from './fixtures'

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await prisma.$disconnect()
})
