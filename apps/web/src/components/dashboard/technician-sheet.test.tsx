import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TechnicianSheet, type TechnicianSheetProps } from '@/components/dashboard/technician-sheet'
import type { Job, Technician } from '@/lib/types'

const technician: Technician = {
  id: 't1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  designation: 'Senior Technician',
  region: 'North',
  skills: ['Electrical', 'HVAC'],
  assignedJobCount: 2,
}

const jobs: Job[] = [
  {
    id: 'j1',
    title: 'Replace breaker panel',
    description: '',
    customerName: 'Alan Turing',
    address: '1 Main St',
    requiredSkill: 'Electrical',
    priority: 'HIGH',
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: 't1',
    assignedAt: '2026-09-10T09:00:00.000Z',
  },
  {
    id: 'j2',
    title: 'Service AC unit',
    description: '',
    customerName: 'Grace Hopper',
    address: '2 Side St',
    requiredSkill: 'HVAC',
    priority: 'LOW',
    scheduledDate: '2026-09-16T00:00:00.000Z',
    technicianId: 't1',
    assignedAt: '2026-09-10T10:00:00.000Z',
  },
]

function renderSheet(props: Partial<TechnicianSheetProps> = {}) {
  const onClose = jest.fn()
  const onAssign = jest.fn()
  const onUnassign = jest.fn()
  render(
    <TechnicianSheet
      open
      technician={technician}
      jobs={jobs}
      loading={false}
      error={null}
      pendingJobId={null}
      onClose={onClose}
      onAssign={onAssign}
      onUnassign={onUnassign}
      {...props}
    />,
  )
  return { onClose, onAssign, onUnassign }
}

describe('TechnicianSheet', () => {
  it('shows technician details and assigned jobs, and unassigns the chosen job', async () => {
    const user = userEvent.setup()
    const { onUnassign } = renderSheet()

    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByText('Senior Technician')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ada@example.com' })).toHaveAttribute('href', 'mailto:ada@example.com')
    expect(screen.getByRole('link', { name: '555-0100' })).toHaveAttribute('href', 'tel:555-0100')
    expect(screen.getByRole('meter', { name: 'Ada Lovelace workload' })).toBeInTheDocument()

    const items = within(screen.getByRole('list', { name: 'Assigned jobs' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Replace breaker panel')
    expect(items[1]).toHaveTextContent('Service AC unit')

    await user.click(within(items[1]).getByRole('button', { name: /^Unassign/ }))
    expect(onUnassign).toHaveBeenCalledTimes(1)
    expect(onUnassign).toHaveBeenCalledWith(jobs[1])
  })

  it('shows an empty state when no jobs are assigned', () => {
    renderSheet({ jobs: [], technician: { ...technician, assignedJobCount: 0 } })

    expect(screen.getByText('No jobs assigned yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Assigned jobs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Unassign/ })).not.toBeInTheDocument()
  })

  it('shows a spinner on the pending job and disables every unassign button', () => {
    renderSheet({ pendingJobId: 'j1' })

    const items = within(screen.getByRole('list', { name: 'Assigned jobs' })).getAllByRole('listitem')
    expect(within(items[0]).getByRole('status')).toBeInTheDocument()
    expect(within(items[1]).queryByRole('status')).not.toBeInTheDocument()

    const buttons = screen.getAllByRole('button', { name: /Unassign/ })
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button).toBeDisabled()
    }
  })

  it('shows an error alert when the jobs fail to load', () => {
    renderSheet({ jobs: [], error: 'Network error' })

    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    expect(screen.queryByRole('list', { name: 'Assigned jobs' })).not.toBeInTheDocument()
  })

  it('opens assignment for the technician from the Assign job button', async () => {
    const user = userEvent.setup()
    const { onAssign } = renderSheet()

    await user.click(screen.getByRole('button', { name: 'Assign job' }))
    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith(technician)
  })

  it('calls onClose when closed from the Close button', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
