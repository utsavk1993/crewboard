import express from 'express'
import { errorHandler, notFoundHandler } from './errors'
import { assistantRouter } from './routes/assistant'
import { healthRouter } from './routes/health'
import { jobsRouter } from './routes/jobs'
import { skillsRouter } from './routes/skills'
import { statsRouter } from './routes/stats'
import { techniciansRouter } from './routes/technicians'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Ahead of the app-wide JSON parser: the assistant accepts larger request bodies and parses its own.
  app.use('/api/assistant', assistantRouter)
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/technicians', techniciansRouter)
  app.use('/api/jobs', jobsRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/skills', skillsRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
