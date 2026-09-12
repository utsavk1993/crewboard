import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { Priority } from '@/lib/types'
import { cn } from '@/lib/utils'

const priorityStyles: Record<Priority, { label: string; variant: BadgeProps['variant']; className?: string }> = {
  URGENT: { label: 'Urgent', variant: 'destructive' },
  HIGH: { label: 'High', variant: 'warning' },
  MEDIUM: { label: 'Medium', variant: 'info' },
  LOW: { label: 'Low', variant: 'outline', className: 'text-muted-foreground' },
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const style = priorityStyles[priority]

  return (
    <Badge variant={style.variant} data-priority={priority} className={cn(style.className, className)}>
      {/* The dot lets urgent jobs stand out in a column of badges without relying on color alone. */}
      {priority === 'URGENT' && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {style.label}
    </Badge>
  )
}
