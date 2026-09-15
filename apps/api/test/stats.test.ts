import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'
import { recomputeActiveJobCounts } from '../src/workload-counter'
import { ids } from './fixtures'

const app = createApp()

const getStats = () => request(app).get('/api/stats')

// Stats read the stored workload counter, so a test can set it directly to reach a boundary.
const setActiveJobCounts = (counts: Record<string, number>) =>
  prisma.$transaction(
    Object.entries(counts).map(([id, activeJobCount]) =>
      prisma.technician.update({ where: { id }, data: { activeJobCount }, select: { id: true } }),
    ),
  )

describe('GET /api/stats', () => {
  it('reports technician and job totals for the fixture', async () => {
    const res = await getStats()

    expect(res.status).toBe(200)
    // Alice holds 2 assigned jobs, Bob 1 and Carol none; 2 jobs wait in the queue.
    expect(res.body).toEqual({
      technicians: { total: 3, available: 1, heavy: 0 },
      jobs: { assigned: 3, unassigned: 2, urgentUnassigned: 0, averagePerTechnician: 1 },
    })
  })

  it('counts technicians with no active jobs as available', async () => {
    await setActiveJobCounts({ [ids.alice]: 0, [ids.bob]: 0 })

    const res = await getStats()

    expect(res.body.technicians).toEqual({ total: 3, available: 3, heavy: 0 })
  })

  it('counts 5 or more active jobs as heavy, and 4 as neither available nor heavy', async () => {
    await setActiveJobCounts({ [ids.alice]: 4, [ids.bob]: 5, [ids.carol]: 12 })

    const res = await getStats()

    expect(res.body.technicians).toEqual({ total: 3, available: 0, heavy: 2 })
  })

  it('leaves completed and cancelled jobs out of the counts', async () => {
    // Alice already has a completed job and there is a cancelled one in the fixture; close one more of hers.
    await prisma.job.update({
      where: { id: ids.aliceAcJob },
      data: { status: 'COMPLETED', completedAt: new Date('2030-01-04T20:00:00Z') },
    })
    // The write bypassed the API, so recompute the stored counters the way bulk writes do.
    await recomputeActiveJobCounts(prisma)

    const res = await getStats()

    expect(res.body).toEqual({
      technicians: { total: 3, available: 1, heavy: 0 },
      jobs: { assigned: 2, unassigned: 2, urgentUnassigned: 0, averagePerTechnician: 0.7 },
    })
  })

  it('counts only urgent jobs that are still waiting for a technician', async () => {
    await prisma.job.updateMany({
      // One open, one assigned and one cancelled job, all urgent: only the open one is in the queue.
      where: { id: { in: [ids.unassignedDishwasherJob, ids.aliceAcJob, ids.cancelledJob] } },
      data: { priority: 'URGENT' },
    })

    const res = await getStats()

    expect(res.body.jobs).toEqual({ assigned: 3, unassigned: 2, urgentUnassigned: 1, averagePerTechnician: 1 })
  })

  it('returns zeros when there are no technicians and no jobs', async () => {
    await prisma.job.deleteMany()
    await prisma.technicianSkill.deleteMany()
    await prisma.technician.deleteMany()

    const res = await getStats()

    expect(res.body).toEqual({
      technicians: { total: 0, available: 0, heavy: 0 },
      jobs: { assigned: 0, unassigned: 0, urgentUnassigned: 0, averagePerTechnician: 0 },
    })
  })

  it('follows an assignment made through the API', async () => {
    const assignment = await request(app)
      .patch(`/api/jobs/${ids.unassignedDishwasherJob}/assignment`)
      .send({ technicianId: ids.carol })
    expect(assignment.status).toBe(200)

    const res = await getStats()

    expect(res.body).toEqual({
      technicians: { total: 3, available: 0, heavy: 0 },
      jobs: { assigned: 4, unassigned: 1, urgentUnassigned: 0, averagePerTechnician: 1.3 },
    })
  })
})
