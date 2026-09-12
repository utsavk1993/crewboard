import { useId, type ReactNode } from 'react'
import { BriefcaseBusiness, Gauge, Inbox, Users, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Job, Technician } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getWorkloadLevel } from '@/lib/workload'

export interface DashboardStats {
  technicianCount: number
  availableTechnicianCount: number
  assignedJobCount: number
  averageJobsPerTechnician: number
  unassignedJobCount: number
  urgentUnassignedJobCount: number
  heavyWorkloadCount: number
}

export function computeStats(technicians: Technician[], unassignedJobs: Job[]): DashboardStats {
  const assignedJobCount = technicians.reduce((sum, technician) => sum + technician.assignedJobCount, 0)
  const countAtLevel = (level: ReturnType<typeof getWorkloadLevel>) =>
    technicians.filter((technician) => getWorkloadLevel(technician.assignedJobCount) === level).length

  return {
    technicianCount: technicians.length,
    availableTechnicianCount: countAtLevel('available'),
    assignedJobCount,
    averageJobsPerTechnician:
      technicians.length === 0 ? 0 : Math.round((assignedJobCount / technicians.length) * 10) / 10,
    unassignedJobCount: unassignedJobs.length,
    urgentUnassignedJobCount: unassignedJobs.filter((job) => job.priority === 'URGENT').length,
    heavyWorkloadCount: countAtLevel('heavy'),
  }
}

interface StatCardProps {
  label: string
  icon: LucideIcon
  loading: boolean
  value: ReactNode
  hint: ReactNode
  hintClassName?: string
}

function StatCard({ label, icon: Icon, loading, value, hint, hintClassName }: StatCardProps) {
  const labelId = useId()

  return (
    <Card role="group" aria-labelledby={labelId} aria-busy={loading || undefined} className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-center justify-between gap-3">
          <p id={labelId} className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            <Icon className="size-4" />
          </span>
        </div>
        {/* Skeletons match the text line heights so the card doesn't shift when data arrives. */}
        {loading ? (
          <>
            <Skeleton className="mt-1 h-8 w-14" />
            <Skeleton className="mt-1 h-4 w-28" />
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className={cn('mt-1 text-xs text-muted-foreground tabular-nums', hintClassName)}>{hint}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface StatCardsProps {
  technicians?: Technician[]
  unassignedJobs?: Job[]
}

export function StatCards({ technicians, unassignedJobs }: StatCardsProps) {
  const stats = computeStats(technicians ?? [], unassignedJobs ?? [])
  const techniciansLoading = technicians === undefined
  const urgentCount = stats.urgentUnassignedJobCount

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Technicians"
        icon={Users}
        loading={techniciansLoading}
        value={stats.technicianCount}
        hint={`${stats.availableTechnicianCount} available`}
      />
      <StatCard
        label="Assigned jobs"
        icon={BriefcaseBusiness}
        loading={techniciansLoading}
        value={stats.assignedJobCount}
        hint={`${stats.averageJobsPerTechnician} avg per technician`}
      />
      <StatCard
        label="Unassigned jobs"
        icon={Inbox}
        loading={unassignedJobs === undefined}
        value={stats.unassignedJobCount}
        hint={urgentCount > 0 ? `${urgentCount} urgent` : 'None urgent'}
        hintClassName={urgentCount > 0 ? 'font-medium text-destructive' : undefined}
      />
      <StatCard
        label="Heavy workload"
        icon={Gauge}
        loading={techniciansLoading}
        value={stats.heavyWorkloadCount}
        hint="at 5+ jobs"
      />
    </div>
  )
}
