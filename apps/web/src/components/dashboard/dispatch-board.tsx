import { useCallback, useState } from 'react'
import { CircleAlertIcon, RotateCwIcon } from 'lucide-react'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TechnicianSheet } from '@/components/dashboard/technician-sheet'
import { TechniciansTable } from '@/components/dashboard/technicians-table'
import { useAssignmentActions } from '@/components/dashboard/use-assignment-actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { errorMessage } from '@/lib/api'
import { useTechnicianJobs, useTechnicians, useUnassignedJobs } from '@/lib/queries'
import type { Technician } from '@/lib/types'

export function DispatchBoard() {
  const technicians = useTechnicians()
  const unassignedJobs = useUnassignedJobs()
  const { openAssign, unassign, pendingJobId, assignDialog } = useAssignmentActions(technicians.data)

  // The sheet keeps its technician id after closing so the exit animation still has content.
  const [sheet, setSheet] = useState({ technicianId: null as string | null, open: false })

  const technicianJobs = useTechnicianJobs(sheet.technicianId)

  // Look the technician up from the latest query data so counts refresh after each assignment.
  const sheetTechnician = technicians.data?.find((t) => t.id === sheet.technicianId) ?? null

  // A stable callback keeps the table's memoized columns from being rebuilt on every render.
  const openSheet = useCallback((technician: Technician) => {
    setSheet({ technicianId: technician.id, open: true })
  }, [])

  return (
    <>
      <StatCards technicians={technicians.data} unassignedJobs={unassignedJobs.data} />

      <Card className="gap-4 py-4">
        <CardHeader className="pt-1">
          <CardTitle>Technicians</CardTitle>
          <CardDescription>Assign open jobs or review each technician's workload.</CardDescription>
        </CardHeader>

        {/* Only replace the table when there is nothing to show; a failed background refetch keeps the last data. */}
        {technicians.isError && !technicians.data ? (
          <div className="px-5 pb-1">
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>Couldn't load technicians</AlertTitle>
              <AlertDescription>
                <p>{errorMessage(technicians.error)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 text-foreground"
                  disabled={technicians.isFetching}
                  onClick={() => technicians.refetch()}
                >
                  <RotateCwIcon aria-hidden="true" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <TechniciansTable
            technicians={technicians.data ?? []}
            loading={technicians.isPending}
            onAssign={openAssign}
            onViewJobs={openSheet}
          />
        )}
      </Card>

      <TechnicianSheet
        open={sheet.open}
        technician={sheetTechnician}
        jobs={technicianJobs.data ?? []}
        loading={technicianJobs.isPending}
        error={technicianJobs.isError ? errorMessage(technicianJobs.error) : null}
        pendingJobId={pendingJobId}
        onClose={() => setSheet((prev) => ({ ...prev, open: false }))}
        onAssign={openAssign}
        onUnassign={unassign}
      />

      {assignDialog}
    </>
  )
}
