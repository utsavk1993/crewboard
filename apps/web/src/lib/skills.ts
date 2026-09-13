import type { Job, SkillCategory, Specialty, Technician } from '@/lib/types'

export interface SpecialtyGroup {
  category: SkillCategory
  specialties: Specialty[]
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

export function groupSpecialties(specialties: Specialty[]): SpecialtyGroup[] {
  const groups = new Map<string, SpecialtyGroup>()
  const seen = new Set<string>()

  for (const specialty of specialties) {
    if (seen.has(specialty.id)) continue
    seen.add(specialty.id)

    const group = groups.get(specialty.category.id)
    if (group) group.specialties.push(specialty)
    else groups.set(specialty.category.id, { category: specialty.category, specialties: [specialty] })
  }

  return [...groups.values()]
    .sort((a, b) => byName(a.category, b.category))
    .map((group) => ({ ...group, specialties: group.specialties.sort(byName) }))
}

/** How well a technician fits a job: the exact specialty, or only another specialty in the same category. */
export type SkillMatch = 'specialty' | 'category'

export function skillMatch(technician: Pick<Technician, 'specialties'>, job: Pick<Job, 'skill'>): SkillMatch | null {
  if (technician.specialties.some((specialty) => specialty.id === job.skill.id)) return 'specialty'
  if (technician.specialties.some((specialty) => specialty.category.id === job.skill.category.id)) return 'category'
  return null
}
