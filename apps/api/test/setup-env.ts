import path from 'node:path'
import { config } from 'dotenv'

// Runs before any test module is loaded, so the Prisma client connects to the test database.
config({ path: path.resolve(__dirname, '../.env'), quiet: true })

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.')
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
