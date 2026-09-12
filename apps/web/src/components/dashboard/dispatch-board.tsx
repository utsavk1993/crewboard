import { useCallback, useState } from 'react'
import { CircleAlertIcon, RotateCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AssignJobDialog } from '@/components/dashboard/assign-job-dialog'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TechnicianSheet } from '@/components/dashboard/technician-sheet'
import { TechniciansTable } from '@/components/dashboard/technicians-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { errorMessage } from '@/lib/api'
import { useSetAssignment, useTechnicianJobs, useTechnicians, useUnassignedJobs } from '@/lib/queries'
import type { Job, Technician } from '@/lib/types'

export function DispatchBoard() {
  const technicians = useTechnicians()
  const unassignedJobs = useUnassignedJobs()
  const setAssignment = useSetAssignment()

  // The dialog and sheet keep their technician id after closing so the exit animation still has content.
  // `session` remounts the dialog each time it opens, clearing the previous search and selection.
  const [assignDialog, setAssignDialog] = useState({ technicianId: null as string | null, open: false, session: 0 })
  const [assignError, setAssignError] = useState<string | null>(null)
  const [sheet, setSheet] = useState({ technicianId: null as string | null, open: false })

  const technicianJobs = useTechnicianJobs(sheet.technicianId)

  // Look technicians up from the latest query data so counts refresh after each assignment.
  const findTechnician = (id: string | null) => technicians.data?.find((t) => t.id === id) ?? null
  const assignTechnician = findTechnician(assignDialog.technicianId)
  const sheetTechnician = findTechnician(sheet.technicianId)

  // Stable callbacks keep the table's memoized columns from being rebuilt on every render.
  const openAssignDialog = useCallback((technician: Technician) => {
    setAssignError(null)
    setAssignDialog((prev) => ({ technicianId: technician.id, open: true, session: prev.session + 1 }))
  }, [])
  const openSheet = useCallback((technician: Technician) => {
    setSheet({ technicianId: technician.id, open: true })
  }, [])
  const closeAssignDialog = () => setAssignDialog((prev) => ({ ...prev, open: false }))

  const handleAssign = async (job: Job) => {
    if (!assignTechnician) return
    setAssignError(null)
    try {
      await setAssignment.mutateAsync({ jobId: job.id, technicianId: assignTechnician.id })
      closeAssignDialog()
      toast.success(`Assigned “${job.title}” to ${assignTechnician.name}`)
    } catch (error) {
      setAssignError(errorMessage(error))
    }
  }

  const handleUnassign = async (job: Job) => {
    try {
      await setAssignment.mutateAsync({ jobId: job.id, technicianId: null })
      toast.success(`Unassigned “${job.title}”`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const pendingJobId = setAssignment.isPending ? (setAssignment.variables?.jobId ?? null) : null

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
            onAssign={openAssignDialog}
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
        onAssign={openAssignDialog}
        onUnassign={handleUnassign}
      />

      <AssignJobDialog
        key={assignDialog.session}
        open={assignDialog.open}
        technician={assignTechnician}
        jobs={unassignedJobs.data ?? []}
        loading={unassignedJobs.isPending}
        submitting={setAssignment.isPending}
        error={assignError ?? (unassignedJobs.isError ? errorMessage(unassignedJobs.error) : null)}
        onClose={closeAssignDialog}
        onAssign={handleAssign}
      />
    </>
  )
}
