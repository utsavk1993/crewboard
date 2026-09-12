import path from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

// Existing process env vars win over .env, so a shell or CI can override any value.
config({ path: path.resolve(__dirname, '../.env'), quiet: true })

const envSchema = z.object({
  DATABASE_URL: z.string({ error: 'DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.' }).min(1),
  PORT: z.coerce.number().int().positive().default(8003),
})

export const env = envSchema.parse(process.env)
