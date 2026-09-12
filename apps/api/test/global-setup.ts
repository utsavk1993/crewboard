import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { config } from 'dotenv'

// Applies migrations to the test database once before the whole test run.
export default function globalSetup() {
  const apiRoot = path.resolve(__dirname, '..')
  config({ path: path.join(apiRoot, '.env'), quiet: true })

  const testDatabaseUrl = process.env.TEST_DATABASE_URL
  if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.')

  try {
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: testDatabaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
      stdio: 'pipe',
    })
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer }
    throw new Error(`Failed to migrate the test database:\n${stdout ?? ''}${stderr ?? ''}`)
  }
}
