import { useId } from 'react'
import { SkillBadge } from '@/components/dashboard/skill-badge'
import { groupSpecialties } from '@/lib/skills'
import type { Specialty } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SkillGroups({ specialties, className }: { specialties: Specialty[]; className?: string }) {
  const baseId = useId()
  const groups = groupSpecialties(specialties)

  if (groups.length === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>No skills listed</p>
  }

  return (
    <div data-slot="skill-groups" className={cn('flex flex-col gap-3', className)}>
      {groups.map((group, index) => {
        // Category ids come from the API and aren't guaranteed to be valid id-refs, so label by position.
        const labelId = `${baseId}-category-${index}`

        return (
          <div key={group.category.id} role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
            <span id={labelId} className="text-xs font-medium text-muted-foreground">
              {group.category.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.specialties.map((specialty) => (
                <SkillBadge key={specialty.id} skill={specialty.name} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
