import { useState } from 'react'
import { Check, CircleAlert, Inbox, Search, SearchX } from 'lucide-react'
import { PriorityBadge } from '@/components/dashboard/priority-badge'
import { SkillBadge } from '@/components/dashboard/skill-badge'
import { WorkloadMeter } from '@/components/dashboard/workload-meter'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatDate } from '@/lib/format'
import type { Job, Priority, Technician } from '@/lib/types'
import { cn } from '@/lib/utils'

const priorityRank: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export type AssignJobDialogProps = {
  open: boolean
  technician: Technician | null
  /** Unassigned jobs to choose from. */
  jobs: Job[]
  loading: boolean
  submitting: boolean
  error: string | null
  onClose: () => void
  onAssign: (job: Job) => void
}

export function AssignJobDialog({
  open,
  technician,
  jobs,
  loading,
  submitting,
  error,
  onClose,
  onAssign,
}: AssignJobDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  const skills = technician?.skills ?? []
  const matchesSkill = (job: Job) => skills.includes(job.requiredSkill)
  const term = search.trim().toLowerCase()

  // Jobs the technician is qualified for first, then most urgent, then soonest.
  const visibleJobs = jobs
    .filter(
      (job) =>
        !term ||
        [job.title, job.customerName, job.address, job.requiredSkill].some((value) =>
          value.toLowerCase().includes(term),
        ),
    )
    .sort(
      (a, b) =>
        Number(matchesSkill(b)) - Number(matchesSkill(a)) ||
        priorityRank[a.priority] - priorityRank[b.priority] ||
        a.scheduledDate.localeCompare(b.scheduledDate),
    )

  // Only a job that is still visible can be assigned, so a search can't hide what the button will assign.
  const selectedJob = visibleJobs.find((job) => job.id === selectedJobId)

  // An in-flight assignment can't be abandoned: the request would still land after the dialog closed.
  const preventWhileSubmitting = (event: Event) => {
    if (submitting) event.preventDefault()
  }

  const jobCount = technician?.assignedJobCount ?? 0

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !submitting && onClose()}>
      <DialogContent
        showCloseButton={!submitting}
        onEscapeKeyDown={preventWhileSubmitting}
        onPointerDownOutside={preventWhileSubmitting}
        onInteractOutside={preventWhileSubmitting}
        className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-xl"
      >
        <DialogHeader className="text-left">
          {/* Title padding keeps a long name clear of the close button; the rows below use the full width. */}
          <DialogTitle className="pr-8 leading-tight">Assign job to {technician?.name}</DialogTitle>
          <DialogDescription>
            {technician && (
              <>
                {technician.designation} · <span className="tabular-nums">{jobCount}</span> assigned{' '}
                {jobCount === 1 ? 'job' : 'jobs'}
              </>
            )}
          </DialogDescription>
          {technician && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
              <ul role="list" aria-label="Skills" className="flex flex-wrap gap-1.5">
                {technician.skills.map((skill) => (
                  <li key={skill}>
                    <SkillBadge skill={skill} />
                  </li>
                ))}
              </ul>
              <WorkloadMeter count={jobCount} name={technician.name} />
            </div>
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search jobs"
              placeholder="Search title, customer, address or skill"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div role="status" aria-label="Loading jobs" className="-mx-1 flex flex-col gap-1.5 p-1">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
                  <Skeleton className="mt-0.5 size-4 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleJobs.length === 0 ? (
            <EmptyState
              icon={jobs.length === 0 ? Inbox : SearchX}
              message={jobs.length === 0 ? 'No unassigned jobs available.' : 'No jobs match your search.'}
            />
          ) : (
            // role="list" is explicit because Safari drops list semantics from a <ul> styled without bullets.
            <ul
              role="list"
              aria-label="Available jobs"
              className="-mx-1 flex max-h-[min(24rem,50vh)] min-h-0 flex-col gap-1.5 overflow-y-auto p-1"
            >
              {visibleJobs.map((job) => {
                const selected = job.id === selectedJobId
                return (
                  <li key={job.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={submitting}
                      onClick={() => setSelectedJobId(job.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-[color,background-color,border-color,box-shadow] outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none motion-reduce:transition-none',
                        selected && 'border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input transition-colors motion-reduce:transition-none',
                          selected && 'border-primary bg-primary text-primary-foreground',
                        )}
                      >
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="mr-auto font-medium">{job.title}</span>
                          <span className="flex items-center gap-1.5">
                            {matchesSkill(job) && (
                              <Badge variant="success">
                                <Check aria-hidden="true" />
                                Skill match
                              </Badge>
                            )}
                            <PriorityBadge priority={job.priority} />
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {job.customerName} · {job.address}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {job.requiredSkill} · Scheduled {formatDate(job.scheduledDate)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="sm:items-center">
          {selectedJob && (
            <p className="mr-auto hidden min-w-0 truncate text-sm text-muted-foreground sm:block">
              Assigning “{selectedJob.title}”
            </p>
          )}
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button disabled={!selectedJob || submitting} onClick={() => selectedJob && onAssign(selectedJob)}>
            {submitting ? (
              <>
                {/* The button text already announces progress, so the spinner stays out of the name. */}
                <Spinner aria-hidden="true" />
                Assigning…
              </>
            ) : (
              'Assign job'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({ icon: Icon, message }: { icon: typeof Inbox; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
