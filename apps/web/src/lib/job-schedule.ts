import type { Job, Priority } from '@/lib/types'

export const priorities: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

const priorityRank: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

/** Soonest first; jobs on the same day put the most urgent first. */
export function sortBySchedule(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      priorityRank[a.priority] - priorityRank[b.priority] ||
      a.title.localeCompare(b.title),
  )
}

export function countByPriority(jobs: Job[]): Record<Priority, number> {
  const counts: Record<Priority, number> = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const job of jobs) counts[job.priority] += 1
  return counts
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The first job scheduled for today or later, or null when everything is in the past. */
export function nextScheduledJob(jobs: Job[], now: Date = new Date()): Job | null {
  // Scheduled dates are calendar dates, so compare against the user's own calendar day, not UTC's.
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return sortBySchedule(jobs).find((job) => job.scheduledDate.slice(0, 10) >= today) ?? null
}
