import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AssignJobDialog } from '@/components/dashboard/assign-job-dialog'
import { errorMessage } from '@/lib/api'
import { useSetAssignment, useUnassignedJobs } from '@/lib/queries'
import type { Job, Technician } from '@/lib/types'

/**
 * The assign and unassign flows shared by every page that changes assignments: the assign dialog's state,
 * the mutation, and its success and error feedback.
 *
 * `technicians` should come straight from query data, so the dialog shows fresh counts after each change.
 * Render `assignDialog` once on the page, whether or not it is open.
 */
export function useAssignmentActions(technicians: readonly Technician[] | undefined) {
  const unassignedJobs = useUnassignedJobs()
  const setAssignment = useSetAssignment()

  // The dialog keeps its technician id after closing so the exit animation still has content.
  // `session` remounts the dialog each time it opens, clearing the previous search and selection.
  const [dialog, setDialog] = useState({ technicianId: null as string | null, open: false, session: 0 })
  const [assignError, setAssignError] = useState<string | null>(null)

  const technician = technicians?.find((t) => t.id === dialog.technicianId) ?? null

  // Stable, so memoized consumers such as the table's columns aren't rebuilt on every render.
  const openAssign = useCallback((target: Technician) => {
    setAssignError(null)
    setDialog((prev) => ({ technicianId: target.id, open: true, session: prev.session + 1 }))
  }, [])
  const closeAssign = () => setDialog((prev) => ({ ...prev, open: false }))

  const assign = async (job: Job) => {
    if (!technician) return
    setAssignError(null)
    try {
      await setAssignment.mutateAsync({ jobId: job.id, technicianId: technician.id })
      closeAssign()
      toast.success(`Assigned “${job.title}” to ${technician.name}`)
    } catch (error) {
      // Stays in the dialog, so the dispatcher can pick another job without reopening it.
      setAssignError(errorMessage(error))
    }
  }

  const unassign = async (job: Job) => {
    try {
      await setAssignment.mutateAsync({ jobId: job.id, technicianId: null })
      toast.success(`Unassigned “${job.title}”`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  /** The job whose assignment is changing, if any. */
  const pendingJobId = setAssignment.isPending ? (setAssignment.variables?.jobId ?? null) : null

  const assignDialog = (
    <AssignJobDialog
      key={dialog.session}
      open={dialog.open}
      technician={technician}
      jobs={unassignedJobs.data ?? []}
      loading={unassignedJobs.isPending}
      submitting={setAssignment.isPending}
      error={assignError ?? (unassignedJobs.isError ? errorMessage(unassignedJobs.error) : null)}
      onClose={closeAssign}
      onAssign={assign}
    />
  )

  return { openAssign, unassign, pendingJobId, assignDialog }
}
