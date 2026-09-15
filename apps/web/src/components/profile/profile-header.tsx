import { MailIcon, PhoneIcon } from 'lucide-react'
import { TechnicianAvatar } from '@/components/dashboard/technician-avatar'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Technician } from '@/lib/types'
import { getWorkloadLevel, workloadLabels, type WorkloadLevel } from '@/lib/workload'

const workloadBadges: Record<WorkloadLevel, { variant: BadgeProps['variant']; className?: string }> = {
  available: { variant: 'outline', className: 'text-muted-foreground' },
  light: { variant: 'success' },
  steady: { variant: 'warning' },
  heavy: { variant: 'destructive' },
}

export function ProfileHeader({ technician }: { technician: Technician }) {
  const level = getWorkloadLevel(technician.assignedJobCount)
  const badge = workloadBadges[level]

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <TechnicianAvatar name={technician.name} size="lg" className="size-14 text-lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight break-words">{technician.name}</h1>
              <Badge variant={badge.variant} data-level={level} className={badge.className}>
                {level === 'available' ? workloadLabels[level] : `${workloadLabels[level]} workload`}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{technician.designation}</p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${technician.email}`}>
              <MailIcon aria-hidden="true" />
              Email
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${technician.phone}`}>
              <PhoneIcon aria-hidden="true" />
              Call
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
