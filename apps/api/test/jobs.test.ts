import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'
import { ids } from './fixtures'

const app = createApp()

const assignment = (jobId: string, body: unknown) => request(app).patch(`/api/jobs/${jobId}/assignment`).send(body as object)

const assignedJobCount = async (technicianId: string) => {
  const res = await request(app).get('/api/technicians')
  return res.body.find((t: { id: string }) => t.id === technicianId).assignedJobCount
}

// Every technician's stored counter must equal a fresh count of the ASSIGNED jobs they hold.
const expectExactCounters = async () => {
  const technicians = await prisma.technician.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, activeJobCount: true, _count: { select: { jobs: { where: { status: 'ASSIGNED' } } } } },
  })
  expect(technicians.map(({ id, activeJobCount }) => [id, activeJobCount])).toEqual(
    technicians.map(({ id, _count }) => [id, _count.jobs]),
  )
}

const britishColumbia = { code: 'BC', name: 'British Columbia' }
const metroVancouver = (city: { id: string; name: string }) => ({
  city,
  region: { id: ids.metroVancouver, name: 'Metro Vancouver' },
  province: britishColumbia,
})
const kelowna = {
  city: { id: ids.kelowna, name: 'Kelowna' },
  region: { id: ids.centralOkanagan, name: 'Central Okanagan' },
  province: britishColumbia,
}

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
      address: '4500 Kingsway, Burnaby, BC V5H 2A9',
      location: metroVancouver({ id: ids.burnaby, name: 'Burnaby' }),
      requiredSkill: 'Panel Upgrades',
      skill: { id: ids.panelUpgrades, name: 'Panel Upgrades', category: { id: ids.electrical, name: 'Electrical' } },
      priority: 'MEDIUM',
      scheduledDate: '2030-01-01T00:00:00.000Z',
      status: 'ASSIGNED',
      technicianId: ids.alice,
      assignedAt: '2029-12-31T12:00:00.000Z',
      completedAt: null,
    })
  })

  it('leaves completed and cancelled jobs out of every list', async () => {
    const closed: string[] = [ids.aliceCompletedJob, ids.cancelledJob]
    const [all, unassigned, alice] = await Promise.all([
      request(app).get('/api/jobs'),
      request(app).get('/api/jobs?unassigned=true'),
      request(app).get(`/api/jobs?technicianId=${ids.alice}`),
    ])

    for (const res of [all, unassigned, alice]) {
      expect(res.status).toBe(200)
      expect(res.body.filter((job: { id: string }) => closed.includes(job.id))).toEqual([])
    }
    expect(all.body.map((job: { status: string }) => job.status).sort()).toEqual(['ASSIGNED', 'ASSIGNED', 'ASSIGNED', 'OPEN', 'OPEN'])
  })

  it('includes each job\'s specialty and category', async () => {
    const res = await request(app).get('/api/jobs')

    expect(
      Object.fromEntries(res.body.map((job: { id: string; requiredSkill: string; skill: unknown }) => [job.id, [job.requiredSkill, job.skill]])),
    ).toEqual({
      [ids.aliceAcJob]: ['Air Conditioning', { id: ids.airConditioning, name: 'Air Conditioning', category: { id: ids.hvac, name: 'HVAC' } }],
      [ids.aliceBreakerJob]: ['Panel Upgrades', { id: ids.panelUpgrades, name: 'Panel Upgrades', category: { id: ids.electrical, name: 'Electrical' } }],
      [ids.bobWaterHeaterJob]: ['Water Heaters', { id: ids.waterHeaters, name: 'Water Heaters', category: { id: ids.plumbing, name: 'Plumbing' } }],
      [ids.unassignedDishwasherJob]: ['Dishwashers', { id: ids.dishwashers, name: 'Dishwashers', category: { id: ids.applianceRepair, name: 'Appliance Repair' } }],
      [ids.unassignedFaucetJob]: [
        'Fixtures & Faucets',
        { id: ids.fixturesAndFaucets, name: 'Fixtures & Faucets', category: { id: ids.plumbing, name: 'Plumbing' } },
      ],
    })
  })

  it("includes each job's site location", async () => {
    const res = await request(app).get('/api/jobs')

    expect(Object.fromEntries(res.body.map((job: { id: string; location: unknown }) => [job.id, job.location]))).toEqual({
      [ids.aliceAcJob]: metroVancouver({ id: ids.surrey, name: 'Surrey' }),
      [ids.aliceBreakerJob]: metroVancouver({ id: ids.burnaby, name: 'Burnaby' }),
      [ids.bobWaterHeaterJob]: metroVancouver({ id: ids.langley, name: 'Langley' }),
      [ids.unassignedDishwasherJob]: kelowna,
      [ids.unassignedFaucetJob]: metroVancouver({ id: ids.mapleRidge, name: 'Maple Ridge' }),
    })
  })

  it('filters unassigned jobs', async () => {
    const res = await request(app).get('/api/jobs?unassigned=true')

    expect(res.status).toBe(200)
    expect(res.body.map((job: { id: string }) => job.id)).toEqual([ids.unassignedFaucetJob, ids.unassignedDishwasherJob])
    expect(
      res.body.every(
        (job: { status: string; technicianId: unknown; assignedAt: unknown }) =>
          job.status === 'OPEN' && job.technicianId === null && job.assignedAt === null,
      ),
    ).toBe(true)
  })

  it("filters a technician's assigned jobs, leaving out their completed ones", async () => {
    const res = await request(app).get(`/api/jobs?technicianId=${ids.alice}`)

    expect(res.status).toBe(200)
    expect(res.body.map((job: { id: string; status: string }) => [job.id, job.status])).toEqual([
      [ids.aliceBreakerJob, 'ASSIGNED'],
      [ids.aliceAcJob, 'ASSIGNED'],
    ])
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

describe('PATCH /api/jobs/:id/assignment', () => {
  it('assigns an unassigned job to a technician', async () => {
    const before = Date.now()
    const res = await assignment(ids.unassignedDishwasherJob, { technicianId: ids.carol })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: ids.unassignedDishwasherJob,
      status: 'ASSIGNED',
      technicianId: ids.carol,
      completedAt: null,
      location: kelowna,
      requiredSkill: 'Dishwashers',
      skill: { id: ids.dishwashers, name: 'Dishwashers', category: { id: ids.applianceRepair, name: 'Appliance Repair' } },
    })
    expect(new Date(res.body.assignedAt).getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(await assignedJobCount(ids.carol)).toBe(1)
    await expectExactCounters()

    const unassigned = await request(app).get('/api/jobs?unassigned=true')
    expect(unassigned.body.map((job: { id: string }) => job.id)).toEqual([ids.unassignedFaucetJob])
  })

  it('returns 409 when the job is already assigned', async () => {
    const res = await assignment(ids.bobWaterHeaterJob, { technicianId: ids.carol })

    expect(res.status).toBe(409)
    expect(res.body.error).toEqual({
      code: 'JOB_ALREADY_ASSIGNED',
      message: 'This job is already assigned to another technician.',
    })
    expect(await assignedJobCount(ids.bob)).toBe(1)
    expect(await assignedJobCount(ids.carol)).toBe(0)
    await expectExactCounters()
  })

  it('returns 409 when the job is already assigned to the same technician', async () => {
    const res = await assignment(ids.bobWaterHeaterJob, { technicianId: ids.bob })

    expect(res.status).toBe(409)
    expect(res.body.error).toEqual({
      code: 'JOB_ALREADY_ASSIGNED',
      message: 'This job is already assigned to this technician.',
    })
    expect(await assignedJobCount(ids.bob)).toBe(1)
    await expectExactCounters()
  })

  it.each([
    ['completed', ids.aliceCompletedJob, { status: 'COMPLETED', technicianId: ids.alice }],
    ['cancelled', ids.cancelledJob, { status: 'CANCELLED', technicianId: null }],
  ])('returns 409 when assigning a %s job and leaves it unchanged', async (_label, jobId, unchanged) => {
    const res = await assignment(jobId, { technicianId: ids.bob })

    expect(res.status).toBe(409)
    expect(res.body.error).toEqual({ code: 'JOB_CLOSED', message: "This job is closed and can't be assigned." })
    expect(await prisma.job.findUnique({ where: { id: jobId }, select: { status: true, technicianId: true } })).toEqual(unchanged)
    expect(await assignedJobCount(ids.bob)).toBe(1)
    await expectExactCounters()
  })

  it('assigns a job again after it was unassigned back to open', async () => {
    await assignment(ids.aliceAcJob, { technicianId: null })
    const res = await assignment(ids.aliceAcJob, { technicianId: ids.bob })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: ids.aliceAcJob, status: 'ASSIGNED', technicianId: ids.bob })
    expect(await assignedJobCount(ids.alice)).toBe(1)
    expect(await assignedJobCount(ids.bob)).toBe(2)
    await expectExactCounters()
  })

  it('lets only one of two concurrent assignments win, counting the job exactly once', async () => {
    const results = await Promise.all([
      assignment(ids.unassignedFaucetJob, { technicianId: ids.bob }),
      assignment(ids.unassignedFaucetJob, { technicianId: ids.carol }),
    ])

    expect(results.map((res) => res.status).sort()).toEqual([200, 409])
    const winner = results.find((res) => res.status === 200)!.body.technicianId
    const [bob, carol] = [await assignedJobCount(ids.bob), await assignedJobCount(ids.carol)]
    expect({ bob, carol }).toEqual(winner === ids.bob ? { bob: 2, carol: 0 } : { bob: 1, carol: 1 })
    await expectExactCounters()
  })

  it('returns 404 for an unknown technician', async () => {
    const res = await assignment(ids.unassignedFaucetJob, { technicianId: randomUUID() })

    expect(res.status).toBe(404)
    expect(res.body.error).toEqual({ code: 'TECHNICIAN_NOT_FOUND', message: 'Technician not found.' })
  })

  it('returns 404 for an unknown job', async () => {
    const res = await assignment(randomUUID(), { technicianId: ids.bob })

    expect(res.status).toBe(404)
    expect(res.body.error).toEqual({ code: 'JOB_NOT_FOUND', message: 'Job not found.' })
  })

  it.each([
    ['a missing technicianId', {}],
    ['a non-uuid technicianId', { technicianId: 'bob' }],
    ['a numeric technicianId', { technicianId: 42 }],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await assignment(ids.unassignedFaucetJob, body)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('technicianId must be a valid UUID or null.')
  })

  it('returns 400 for an invalid job id', async () => {
    const res = await assignment('not-a-uuid', { technicianId: ids.bob })

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Job id must be a valid UUID.' })
  })

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${ids.unassignedFaucetJob}/assignment`)
      .set('Content-Type', 'application/json')
      .send('{"technicianId":')

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({ code: 'BAD_REQUEST', message: 'Request body must be valid JSON.' })
  })

  it('unassigns an assigned job', async () => {
    const res = await assignment(ids.aliceAcJob, { technicianId: null })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: ids.aliceAcJob,
      status: 'OPEN',
      technicianId: null,
      assignedAt: null,
      completedAt: null,
      location: metroVancouver({ id: ids.surrey, name: 'Surrey' }),
      requiredSkill: 'Air Conditioning',
      skill: { id: ids.airConditioning, name: 'Air Conditioning', category: { id: ids.hvac, name: 'HVAC' } },
    })
    expect(await assignedJobCount(ids.alice)).toBe(1)
    await expectExactCounters()

    const unassigned = await request(app).get('/api/jobs?unassigned=true')
    expect(unassigned.body.map((job: { id: string }) => job.id)).toContain(ids.aliceAcJob)
  })

  it('treats unassigning an already unassigned job as a no-op', async () => {
    const res = await assignment(ids.unassignedFaucetJob, { technicianId: null })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: ids.unassignedFaucetJob, status: 'OPEN', technicianId: null, assignedAt: null })
    expect(await assignedJobCount(ids.alice)).toBe(2)
    await expectExactCounters()
  })

  it('releases a job only once when two unassignments race', async () => {
    const results = await Promise.all([
      assignment(ids.aliceAcJob, { technicianId: null }),
      assignment(ids.aliceAcJob, { technicianId: null }),
    ])

    expect(results.map((res) => [res.status, res.body.status])).toEqual([
      [200, 'OPEN'],
      [200, 'OPEN'],
    ])
    expect(await assignedJobCount(ids.alice)).toBe(1)
    await expectExactCounters()
  })

  it.each([
    ['completed', ids.aliceCompletedJob, 'COMPLETED', ids.alice],
    ['cancelled', ids.cancelledJob, 'CANCELLED', null],
  ])('returns 409 when unassigning a %s job and leaves it unchanged', async (_label, jobId, status, technicianId) => {
    const res = await assignment(jobId, { technicianId: null })

    expect(res.status).toBe(409)
    expect(res.body.error).toEqual({ code: 'JOB_CLOSED', message: "This job is closed and can't be unassigned." })
    expect(await prisma.job.findUnique({ where: { id: jobId }, select: { status: true, technicianId: true } })).toEqual({
      status,
      technicianId,
    })
    expect(await assignedJobCount(ids.alice)).toBe(2)
    await expectExactCounters()
  })

  it('returns 404 when unassigning an unknown job', async () => {
    const res = await assignment(randomUUID(), { technicianId: null })

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('JOB_NOT_FOUND')
  })
})
