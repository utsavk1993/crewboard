import { rankJobsForTechnician } from '@/lib/job-ranking'
import type { Job, Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

const alberta = { code: 'AB', name: 'Alberta' }

const surrey = makeLocation('Surrey')
const burnaby = makeLocation('Burnaby')
const kelowna = makeLocation('Kelowna', 'Central Okanagan')
const calgary = makeLocation('Calgary', 'Calgary Region', alberta)

const panelUpgrades = makeSpecialty('Panel Upgrades', 'Electrical')
const evChargers = makeSpecialty('EV Chargers', 'Electrical')
const waterHeaters = makeSpecialty('Water Heaters', 'Plumbing')

const technician: Pick<Technician, 'specialties' | 'location'> = {
  specialties: [panelUpgrades],
  location: surrey,
}

function makeJob(overrides: Partial<Job> & Pick<Job, 'id'>): Job {
  const skill = overrides.skill ?? waterHeaters
  return {
    title: overrides.id,
    description: '',
    customerName: 'Customer',
    address: '1 Main St',
    requiredSkill: skill.name,
    skill,
    location: calgary,
    priority: 'MEDIUM',
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: null,
    assignedAt: null,
    ...overrides,
  }
}

const rankedIds = (jobs: Job[]) => rankJobsForTechnician(jobs, technician).map(({ job }) => job.id)

describe('rankJobsForTechnician', () => {
  it('returns each job with how it matches the technician', () => {
    const job = makeJob({ id: 'panel', skill: panelUpgrades, location: burnaby })

    expect(rankJobsForTechnician([job], technician)).toEqual([
      { job, match: { skill: 'specialty', proximity: 'region' } },
    ])
  })

  it('reports no match for another category in another province', () => {
    const [ranked] = rankJobsForTechnician([makeJob({ id: 'heater' })], technician)

    expect(ranked.match).toEqual({ skill: null, proximity: null })
  })

  it('puts the exact specialty first, then the same category, then other skills', () => {
    const jobs = [
      makeJob({ id: 'other', skill: waterHeaters }),
      makeJob({ id: 'category', skill: evChargers }),
      makeJob({ id: 'specialty', skill: panelUpgrades }),
    ]

    expect(rankedIds(jobs)).toEqual(['specialty', 'category', 'other'])
  })

  it('ranks the skill match ahead of proximity', () => {
    const jobs = [
      makeJob({ id: 'nearby-category', skill: evChargers, location: surrey }),
      makeJob({ id: 'far-specialty', skill: panelUpgrades, location: calgary }),
      makeJob({ id: 'nearby-other', skill: waterHeaters, location: surrey }),
    ]

    expect(rankedIds(jobs)).toEqual(['far-specialty', 'nearby-category', 'nearby-other'])
  })

  it('within a skill tier, puts the same city first, then the region, then the province, then elsewhere', () => {
    const jobs = [
      makeJob({ id: 'elsewhere', location: calgary }),
      makeJob({ id: 'province', location: kelowna }),
      makeJob({ id: 'region', location: burnaby }),
      makeJob({ id: 'city', location: makeLocation('Surrey') }),
    ]

    expect(rankedIds(jobs)).toEqual(['city', 'region', 'province', 'elsewhere'])
  })

  it('ranks proximity ahead of priority', () => {
    const jobs = [
      makeJob({ id: 'far-urgent', location: kelowna, priority: 'URGENT' }),
      makeJob({ id: 'near-low', location: surrey, priority: 'LOW' }),
    ]

    expect(rankedIds(jobs)).toEqual(['near-low', 'far-urgent'])
  })

  it('then orders by priority from urgent to low', () => {
    const jobs = [
      makeJob({ id: 'low', priority: 'LOW' }),
      makeJob({ id: 'high', priority: 'HIGH' }),
      makeJob({ id: 'urgent', priority: 'URGENT' }),
      makeJob({ id: 'medium', priority: 'MEDIUM' }),
    ]

    expect(rankedIds(jobs)).toEqual(['urgent', 'high', 'medium', 'low'])
  })

  it('ranks priority ahead of the scheduled date', () => {
    const jobs = [
      makeJob({ id: 'soon-low', priority: 'LOW', scheduledDate: '2026-09-13T00:00:00.000Z' }),
      makeJob({ id: 'later-high', priority: 'HIGH', scheduledDate: '2026-09-20T00:00:00.000Z' }),
    ]

    expect(rankedIds(jobs)).toEqual(['later-high', 'soon-low'])
  })

  it('then orders by scheduled date, soonest first', () => {
    const jobs = [
      makeJob({ id: 'later', scheduledDate: '2026-09-20T00:00:00.000Z' }),
      makeJob({ id: 'soonest', scheduledDate: '2026-09-13T00:00:00.000Z' }),
      makeJob({ id: 'soon', scheduledDate: '2026-09-15T00:00:00.000Z' }),
    ]

    expect(rankedIds(jobs)).toEqual(['soonest', 'soon', 'later'])
  })

  it('breaks remaining ties by title', () => {
    const jobs = [
      makeJob({ id: 'b', title: 'Replace water heater' }),
      makeJob({ id: 'a', title: 'Flush water heater' }),
    ]

    expect(rankedIds(jobs)).toEqual(['a', 'b'])
  })

  it('leaves the input untouched', () => {
    const jobs = [makeJob({ id: 'other' }), makeJob({ id: 'specialty', skill: panelUpgrades })]

    rankJobsForTechnician(jobs, technician)

    expect(jobs.map((job) => job.id)).toEqual(['other', 'specialty'])
  })

  it('ranks by location alone for a technician without specialties', () => {
    const jobs = [makeJob({ id: 'far', skill: panelUpgrades }), makeJob({ id: 'near', location: surrey })]

    expect(rankJobsForTechnician(jobs, { ...technician, specialties: [] }).map(({ job }) => job.id)).toEqual([
      'near',
      'far',
    ])
  })
})
