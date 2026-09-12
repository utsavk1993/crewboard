import type { ReactNode } from 'react'
import { CalendarDaysIcon, CircleAlertIcon, MailIcon, MapPinIcon, PhoneIcon, PlusIcon, type LucideIcon } from 'lucide-react'
import { PriorityBadge } from '@/components/dashboard/priority-badge'
import { SkillBadge } from '@/components/dashboard/skill-badge'
import { TechnicianAvatar } from '@/components/dashboard/technician-avatar'
import { WorkloadMeter } from '@/components/dashboard/workload-meter'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/format'
import type { Job, Technician } from '@/lib/types'

export type TechnicianSheetProps = {
  open: boolean
  technician: Technician | null
  jobs: Job[]
  loading: boolean
  error: string | null
  /** Job currently being unassigned, if any. */
  pendingJobId: string | null
  onClose: () => void
  onAssign: (technician: Technician) => void
  onUnassign: (job: Job) => void
}

const linkClassName =
  'truncate rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

function ContactRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
  )
}

function JobCardSkeleton() {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="mt-1.5 h-4 w-1/2" />
      <div className="mt-2 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

interface AssignedJobsProps {
  jobs: Job[]
  loading: boolean
  error: string | null
  pendingJobId: string | null
  onUnassign: (job: Job) => void
}

function AssignedJobs({ jobs, loading, error, pendingJobId, onUnassign }: AssignedJobsProps) {
  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading assigned jobs</span>
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Couldn't load assigned jobs</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No jobs assigned yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Assigned jobs will appear here.</p>
      </div>
    )
  }

  return (
    <ul aria-label="Assigned jobs" className="flex flex-col gap-3">
      {jobs.map((job) => (
        <li key={job.id} className="rounded-lg border bg-card p-3 text-card-foreground">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm leading-5 font-medium">{job.title}</p>
            <PriorityBadge priority={job.priority} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {job.customerName} · {job.address}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            {/* The calendar icon separates skill and date, so a wrap on narrow screens never strands a "·". */}
            <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{job.requiredSkill}</span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
                Scheduled {formatDate(job.scheduledDate)}
              </span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              // One unassign at a time, so the list and counts settle before the next change.
              disabled={pendingJobId !== null}
              onClick={() => onUnassign(job)}
              className="-mr-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/10"
            >
              {pendingJobId === job.id && <Spinner />}
              Unassign
              <span className="sr-only"> {job.title}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function TechnicianSheet({
  open,
  technician,
  jobs,
  loading,
  error,
  pendingJobId,
  onClose,
  onAssign,
  onUnassign,
}: TechnicianSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {technician ? (
          <>
            {/* Right padding leaves room for the sheet's close button. */}
            <SheetHeader className="flex-row items-center gap-3 border-b py-4 pr-12 pl-5">
              <TechnicianAvatar name={technician.name} size="lg" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <SheetTitle className="truncate text-base leading-6">{technician.name}</SheetTitle>
                <SheetDescription className="truncate">{technician.designation}</SheetDescription>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-col gap-2 text-sm">
                  <ContactRow icon={MailIcon}>
                    <a href={`mailto:${technician.email}`} className={linkClassName}>
                      {technician.email}
                    </a>
                  </ContactRow>
                  <ContactRow icon={PhoneIcon}>
                    <a href={`tel:${technician.phone}`} className={`${linkClassName} tabular-nums`}>
                      {technician.phone}
                    </a>
                  </ContactRow>
                  <ContactRow icon={MapPinIcon}>
                    <span className="truncate">{technician.region}</span>
                  </ContactRow>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {technician.skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Workload</span>
                  <WorkloadMeter count={technician.assignedJobCount} name={technician.name} />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    Assigned jobs
                    <Badge variant="secondary">{technician.assignedJobCount}</Badge>
                  </h3>
                  <Button size="sm" onClick={() => onAssign(technician)}>
                    <PlusIcon aria-hidden="true" />
                    Assign job
                  </Button>
                </div>

                <AssignedJobs
                  jobs={jobs}
                  loading={loading}
                  error={error}
                  pendingJobId={pendingJobId}
                  onUnassign={onUnassign}
                />
              </div>
            </div>
          </>
        ) : (
          // The parent clears the technician only while closed; Radix still requires a title and description.
          <>
            <SheetTitle className="sr-only">Technician details</SheetTitle>
            <SheetDescription className="sr-only">No technician selected.</SheetDescription>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
