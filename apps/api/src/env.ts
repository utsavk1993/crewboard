import path from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

// Existing process env vars win over .env, so a shell or CI can override any value.
config({ path: path.resolve(__dirname, '../.env'), quiet: true })

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8003),
})

export const env = envSchema.parse(process.env)
