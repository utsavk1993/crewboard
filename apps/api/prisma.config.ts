import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

config({ quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Read directly (not via `env()`, which throws) so `prisma generate` works without a .env file.
    // Migrate commands still need DATABASE_URL and will fail with a clear error if it is missing.
    url: process.env.DATABASE_URL,
  },
})
