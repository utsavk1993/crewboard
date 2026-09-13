import { proximity, type Proximity } from '@/lib/location'
import { skillMatch, type SkillMatch } from '@/lib/skills'
import type { Job, Priority, Technician } from '@/lib/types'

/** Why a job suits a technician: how closely the skill fits and the narrowest area they share. */
export interface JobMatch {
  skill: SkillMatch | null
  proximity: Proximity | null
}

export interface RankedJob {
  job: Job
  match: JobMatch
}

const skillRank: Record<SkillMatch, number> = { specialty: 0, category: 1 }
const proximityRank: Record<Proximity, number> = { city: 0, region: 1, province: 2 }
const priorityRank: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

// Anything without a match sorts after every tier that has one.
const rankOf = <T extends string>(ranks: Record<T, number>, value: T | null) =>
  value === null ? Object.keys(ranks).length : ranks[value]

/**
 * Orders jobs for a technician: the exact specialty first, then the same category, then the closest
 * location, then the most urgent, then the soonest, with the title keeping equal jobs in a stable order.
 */
export function rankJobsForTechnician(
  jobs: Job[],
  technician: Pick<Technician, 'specialties' | 'location'>,
): RankedJob[] {
  return jobs
    .map((job) => ({
      job,
      match: { skill: skillMatch(technician, job), proximity: proximity(technician.location, job.location) },
    }))
    .sort(
      (a, b) =>
        rankOf(skillRank, a.match.skill) - rankOf(skillRank, b.match.skill) ||
        rankOf(proximityRank, a.match.proximity) - rankOf(proximityRank, b.match.proximity) ||
        priorityRank[a.job.priority] - priorityRank[b.job.priority] ||
        a.job.scheduledDate.localeCompare(b.job.scheduledDate) ||
        a.job.title.localeCompare(b.job.title),
    )
}
