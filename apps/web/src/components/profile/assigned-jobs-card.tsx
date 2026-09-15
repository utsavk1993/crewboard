import { CalendarDaysIcon, ChevronRightIcon, CircleAlertIcon, MapPinIcon, RotateCwIcon } from 'lucide-react'
import { PriorityBadge } from '@/components/dashboard/priority-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { sortBySchedule } from '@/lib/job-schedule'
import { formatLocation } from '@/lib/location'
import type { Job } from '@/lib/types'

export interface AssignedJobsCardProps {
  /** Undefined until the first load finishes. */
  jobs: Job[] | undefined
  error: string | null
  retrying: boolean
  onRetry: () => void
}

function JobItem({ job }: { job: Job }) {
  return (
    <li className="flex flex-col gap-1 px-5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm leading-5 font-medium">{job.title}</p>
        <PriorityBadge priority={job.priority} />
      </div>
      <p className="text-sm text-muted-foreground">
        {job.customerName} · {job.address}
      </p>
      {/* Each item leads with its own icon instead of a "·" separator, so a wrap on narrow screens never strands one. */}
      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="truncate">{job.skill.category.name}</span>
          <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0" />
          {/* Screen readers skip the chevron, so they hear "Electrical, Panel Upgrades". */}
          <span className="sr-only">, </span>
          <span className="truncate">{job.skill.name}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{formatLocation(job.location)}</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
          <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
          Scheduled {formatDate(job.scheduledDate)}
        </span>
      </p>
    </li>
  )
}

export function JobItemSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3.5 w-3/5" />
    </div>
  )
}

function Body({ jobs, error, retrying, onRetry }: AssignedJobsCardProps) {
  if (jobs === undefined && error) {
    return (
      <CardContent className="py-5">
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Couldn't load assigned jobs</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-1 text-foreground" disabled={retrying} onClick={onRetry}>
              <RotateCwIcon aria-hidden="true" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </CardContent>
    )
  }

  if (jobs === undefined) {
    return (
      <div aria-busy="true" className="divide-y">
        <span className="sr-only">Loading assigned jobs</span>
        <JobItemSkeleton />
        <JobItemSkeleton />
        <JobItemSkeleton />
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <CardContent className="py-5">
        <div className="rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="text-sm font-medium">No jobs assigned yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Jobs assigned from the dispatch board appear here.</p>
        </div>
      </CardContent>
    )
  }

  return (
    <ul aria-label="Assigned jobs" className="divide-y">
      {sortBySchedule(jobs).map((job) => (
        <JobItem key={job.id} job={job} />
      ))}
    </ul>
  )
}

export function AssignedJobsCard(props: AssignedJobsCardProps) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle>
          <h2>Assigned jobs</h2>
        </CardTitle>
        <CardDescription>Soonest first</CardDescription>
        {props.jobs && (
          <CardAction>
            <Badge variant="secondary">
              {props.jobs.length}
              <span className="sr-only"> {props.jobs.length === 1 ? 'job' : 'jobs'}</span>
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <Body {...props} />
    </Card>
  )
}
