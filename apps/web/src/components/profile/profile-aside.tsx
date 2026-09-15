import type { ReactNode } from 'react'
import { LocationLabel } from '@/components/dashboard/location-label'
import { PriorityBadge } from '@/components/dashboard/priority-badge'
import { SkillGroups } from '@/components/dashboard/skill-groups'
import { WorkloadMeter } from '@/components/dashboard/workload-meter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMonthYear, formatTenure } from '@/lib/format'
import { countByPriority, nextScheduledJob, priorities } from '@/lib/job-schedule'
import type { Job, Technician } from '@/lib/types'

const linkClassName =
  'rounded-sm break-all underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

export function DetailsCard({ technician }: { technician: Technician }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Details</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <Detail term="Home base">
            {/* The row's label already says what this is, so the pin would only add noise. Wrapping instead of
                truncating keeps every place readable in a narrow column. */}
            <LocationLabel
              location={technician.location}
              detail="full"
              className="flex-wrap [&>svg:first-child]:hidden"
            />
          </Detail>
          <Detail term="Joined">
            <time dateTime={technician.hiredOn.slice(0, 10)}>{formatMonthYear(technician.hiredOn)}</time>
            <span className="text-muted-foreground"> · {formatTenure(technician.hiredOn)}</span>
          </Detail>
          <Detail term="Email">
            <a href={`mailto:${technician.email}`} className={linkClassName}>
              {technician.email}
            </a>
          </Detail>
          <Detail term="Phone">
            <a href={`tel:${technician.phone}`} className={`${linkClassName} tabular-nums`}>
              {technician.phone}
            </a>
          </Detail>
        </dl>
      </CardContent>
    </Card>
  )
}

export function SkillsCard({ technician }: { technician: Technician }) {
  const count = technician.specialties.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Skills</h2>
        </CardTitle>
        {count > 0 && <CardDescription>{count === 1 ? '1 specialty' : `${count} specialties`}</CardDescription>}
      </CardHeader>
      <CardContent>
        <SkillGroups specialties={technician.specialties} />
      </CardContent>
    </Card>
  )
}

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
}

export interface WorkloadCardProps {
  technician: Technician
  /** Undefined while the jobs are loading or when they failed to load. */
  jobs: Job[] | undefined
  loading: boolean
}

function JobBreakdown({ jobs, loading }: Omit<WorkloadCardProps, 'technician'>) {
  if (jobs === undefined) {
    return loading ? (
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Unavailable</p>
    )
  }

  const counts = countByPriority(jobs)

  return (
    <ul aria-label="Jobs by priority" className="flex flex-col gap-2">
      {priorities.map((priority) => (
        <li key={priority} className="flex items-center justify-between gap-3">
          <PriorityBadge priority={priority} />
          <span className={counts[priority] === 0 ? 'text-sm text-muted-foreground tabular-nums' : 'text-sm font-medium tabular-nums'}>
            {counts[priority]}
          </span>
        </li>
      ))}
    </ul>
  )
}

function NextJob({ jobs, loading }: Omit<WorkloadCardProps, 'technician'>) {
  if (jobs === undefined) {
    return loading ? (
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Unavailable</p>
    )
  }

  const next = nextScheduledJob(jobs)
  if (!next) return <p className="text-sm text-muted-foreground">Nothing scheduled</p>

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm font-medium">{next.title}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{formatDate(next.scheduledDate)}</p>
    </div>
  )
}

export function WorkloadCard({ technician, jobs, loading }: WorkloadCardProps) {
  const count = technician.assignedJobCount

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Workload</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums">{count}</span>
            <span className="text-sm text-muted-foreground">{count === 1 ? 'assigned job' : 'assigned jobs'}</span>
          </p>
          <WorkloadMeter count={count} name={technician.name} />
        </div>

        <Separator />

        <section className="flex flex-col gap-2.5">
          <Subheading>By priority</Subheading>
          <JobBreakdown jobs={jobs} loading={loading} />
        </section>

        <Separator />

        <section className="flex flex-col gap-2">
          <Subheading>Next scheduled job</Subheading>
          <NextJob jobs={jobs} loading={loading} />
        </section>
      </CardContent>
    </Card>
  )
}
