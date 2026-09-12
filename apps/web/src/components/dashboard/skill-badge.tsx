import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function SkillBadge({ skill, className }: { skill: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-normal text-muted-foreground', className)}>
      {skill}
    </Badge>
  )
}
