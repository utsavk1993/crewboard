import { createApp } from './app'
import { env } from './env'

const server = createApp().listen(env.PORT, (error) => {
  if (error) throw error
  console.log(`API listening on http://localhost:${env.PORT}`)
})

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    process.exit(0)
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
