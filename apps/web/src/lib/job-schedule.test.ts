import { countByPriority, nextScheduledJob, sortBySchedule } from '@/lib/job-schedule'
import { makeJob } from '@/test/factories'

const later = makeJob({ title: 'Later', scheduledDate: '2026-09-20T00:00:00.000Z', priority: 'URGENT' })
const soonLow = makeJob({ title: 'Soon low', scheduledDate: '2026-09-15T00:00:00.000Z', priority: 'LOW' })
const soonHigh = makeJob({ title: 'Soon high', scheduledDate: '2026-09-15T00:00:00.000Z', priority: 'HIGH' })
const past = makeJob({ title: 'Past', scheduledDate: '2026-09-01T00:00:00.000Z', priority: 'HIGH' })

describe('sortBySchedule', () => {
  it('orders by scheduled date, then urgency, without changing the input', () => {
    const jobs = [later, soonLow, past, soonHigh]

    expect(sortBySchedule(jobs).map((job) => job.title)).toEqual(['Past', 'Soon high', 'Soon low', 'Later'])
    expect(jobs[0]).toBe(later)
  })
})

describe('countByPriority', () => {
  it('counts every priority, including ones with no jobs', () => {
    expect(countByPriority([later, soonLow, soonHigh, past])).toEqual({ URGENT: 1, HIGH: 2, MEDIUM: 0, LOW: 1 })
  })
})

describe('nextScheduledJob', () => {
  it('returns the soonest job scheduled for today or later', () => {
    expect(nextScheduledJob([later, past, soonLow, soonHigh], new Date(2026, 8, 15, 18))).toBe(soonHigh)
  })

  it('returns null when every job is in the past', () => {
    expect(nextScheduledJob([past], new Date(2026, 8, 14))).toBeNull()
    expect(nextScheduledJob([], new Date(2026, 8, 14))).toBeNull()
  })
})
