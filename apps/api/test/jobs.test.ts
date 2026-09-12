import request from 'supertest'
import { createApp } from '../src/app'
import { ids } from './fixtures'

const app = createApp()

describe('GET /api/jobs', () => {
  it('returns all jobs sorted by scheduled date', async () => {
    const res = await request(app).get('/api/jobs')

    expect(res.status).toBe(200)
    expect(res.body.map((job: { id: string }) => job.id)).toEqual([
      ids.aliceBreakerJob,
      ids.bobWaterHeaterJob,
      ids.aliceAcJob,
      ids.unassignedFaucetJob,
      ids.unassignedDishwasherJob,
    ])
    expect(res.body[0]).toMatchObject({
      id: ids.aliceBreakerJob,
      title: 'Breaker keeps tripping',
      requiredSkill: 'Electrical',
      priority: 'MEDIUM',
      scheduledDate: '2030-01-01T00:00:00.000Z',
      technicianId: ids.alice,
      assignedAt: '2029-12-31T12:00:00.000Z',
    })
  })

  it('filters unassigned jobs', async () => {
    const res = await request(app).get('/api/jobs?unassigned=true')

    expect(res.status).toBe(200)
    expect(res.body.map((job: { id: string }) => job.id)).toEqual([ids.unassignedFaucetJob, ids.unassignedDishwasherJob])
    expect(res.body.every((job: { technicianId: unknown; assignedAt: unknown }) => job.technicianId === null && job.assignedAt === null)).toBe(true)
  })

  it("filters a technician's jobs", async () => {
    const res = await request(app).get(`/api/jobs?technicianId=${ids.alice}`)

    expect(res.status).toBe(200)
    expect(res.body.map((job: { id: string }) => job.id)).toEqual([ids.aliceBreakerJob, ids.aliceAcJob])
  })

  it('rejects an invalid technicianId filter', async () => {
    const res = await request(app).get('/api/jobs?technicianId=not-a-uuid')

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'technicianId must be a valid UUID.' })
  })

  it('rejects combining the unassigned and technicianId filters', async () => {
    const res = await request(app).get(`/api/jobs?unassigned=true&technicianId=${ids.alice}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Use either unassigned or technicianId, not both.' })
  })

  it('rejects an unassigned value other than true', async () => {
    const res = await request(app).get('/api/jobs?unassigned=false')

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'unassigned must be "true" when provided.' })
  })
})
