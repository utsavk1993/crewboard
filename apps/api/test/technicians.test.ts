import request from 'supertest'
import { createApp } from '../src/app'
import { ids } from './fixtures'

const app = createApp()

describe('GET /api/technicians', () => {
  it('lists technicians sorted by name with their assigned job count', async () => {
    const res = await request(app).get('/api/technicians')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: ids.alice,
        name: 'Alice Nguyen',
        email: 'alice@test.example',
        phone: '(555) 010-0001',
        designation: 'Senior Technician',
        region: 'North',
        skills: ['HVAC', 'Electrical'],
        assignedJobCount: 2,
      },
      expect.objectContaining({ id: ids.bob, name: 'Bob Martinez', assignedJobCount: 1 }),
      expect.objectContaining({ id: ids.carol, name: 'Carol Smith', assignedJobCount: 0 }),
    ])
  })
})
