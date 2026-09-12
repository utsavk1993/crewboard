import express from 'express'
import { errorHandler, notFoundHandler } from './errors'
import { healthRouter } from './routes/health'
import { techniciansRouter } from './routes/technicians'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/technicians', techniciansRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
