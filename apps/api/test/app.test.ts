import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

describe('app', () => {
  it('GET /api/health reports ok', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/nope' } })
  })

  it('returns a JSON 400 for a malformed JSON body', async () => {
    const res = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{"a":')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON.' } })
  })
})
