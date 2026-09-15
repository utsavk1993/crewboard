import { ArrowLeftIcon, CircleAlertIcon, RotateCwIcon, UserRoundXIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { AssignedJobsCard, JobItemSkeleton } from '@/components/profile/assigned-jobs-card'
import { ProfileHeader } from '@/components/profile/profile-header'
import { DetailsCard, SkillsCard, WorkloadCard } from '@/components/profile/profile-aside'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, errorMessage } from '@/lib/api'
import { useTechnician, useTechnicianJobs } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/use-document-title'

// A malformed id (400) can never match a technician either, so both read as "not found" to the user.
const isNotFound = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 400)

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      Dispatch board
    </Link>
  )
}

function CardSkeleton({ lines }: { lines: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

// Mirrors the loaded layout so nothing jumps when the technician arrives.
function ProfileSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading technician</span>
      <Card>
        <CardContent className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="border-b">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </CardHeader>
          <div className="divide-y">
            <JobItemSkeleton />
            <JobItemSkeleton />
            <JobItemSkeleton />
          </div>
        </Card>
        <div className="flex flex-col gap-6">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </div>
  )
}

function TechnicianNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border bg-muted text-muted-foreground">
        <UserRoundXIcon aria-hidden="true" className="size-6" />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Technician not found</h1>
        <p className="text-sm text-muted-foreground">This technician doesn't exist or may have been removed.</p>
      </div>
      <Button asChild>
        <Link to="/">
          <ArrowLeftIcon aria-hidden="true" />
          Back to dispatch board
        </Link>
      </Button>
    </div>
  )
}

export function TechnicianProfilePage() {
  const { technicianId = '' } = useParams()
  const technician = useTechnician(technicianId)
  const jobs = useTechnicianJobs(technicianId)

  useDocumentTitle(technician.data?.name ?? 'Technician')

  // A failed background refetch keeps showing the last data rather than replacing the page.
  if (!technician.data && technician.isError && isNotFound(technician.error)) {
    return <TechnicianNotFound />
  }

  function renderContent() {
    if (technician.data) {
      const jobsError = jobs.isError ? errorMessage(jobs.error) : null
      return (
        <>
          <ProfileHeader technician={technician.data} />
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
              <AssignedJobsCard
                jobs={jobs.data}
                error={jobsError}
                retrying={jobs.isFetching}
                onRetry={() => jobs.refetch()}
              />
            </div>
            <aside aria-label="Technician summary" className="flex min-w-0 flex-col gap-6">
              <DetailsCard technician={technician.data} />
              <SkillsCard technician={technician.data} />
              <WorkloadCard technician={technician.data} jobs={jobs.data} loading={jobs.isPending && !jobs.isError} />
            </aside>
          </div>
        </>
      )
    }

    if (technician.isError) {
      return (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Couldn't load technician</AlertTitle>
          <AlertDescription>
            <p>{errorMessage(technician.error)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 text-foreground"
              disabled={technician.isFetching}
              onClick={() => technician.refetch()}
            >
              <RotateCwIcon aria-hidden="true" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return <ProfileSkeleton />
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <div className="flex flex-col gap-6">{renderContent()}</div>
    </div>
  )
}
