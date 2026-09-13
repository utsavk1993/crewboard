import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssignJobDialog, type AssignJobDialogProps } from '@/components/dashboard/assign-job-dialog'
import type { Job, Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

const technician: Technician = {
  id: 't1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  designation: 'Senior Technician',
  region: 'North',
  skills: ['Electrical'],
  specialties: [makeSpecialty('Electrical', 'Trades')],
  location: makeLocation('North'),
  assignedJobCount: 2,
}

function makeJob(overrides: Partial<Job>): Job {
  const requiredSkill = overrides.requiredSkill ?? 'HVAC'
  return {
    id: 'job',
    title: 'Job',
    description: '',
    customerName: 'Customer',
    address: '1 Main St',
    requiredSkill,
    skill: makeSpecialty(requiredSkill, 'Trades'),
    location: makeLocation('Surrey'),
    priority: 'MEDIUM',
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: null,
    assignedAt: null,
    ...overrides,
  }
}

// The plumbing job is more urgent, but the electrical job matches the technician's skills.
const plumbingJob = makeJob({
  id: 'j1',
  title: 'Fix leaking pipe',
  customerName: 'Grace Hopper',
  requiredSkill: 'Plumbing',
  priority: 'URGENT',
})
const electricalJob = makeJob({
  id: 'j2',
  title: 'Replace breaker panel',
  customerName: 'Alan Turing',
  requiredSkill: 'Electrical',
  priority: 'LOW',
})

function renderDialog(props: Partial<AssignJobDialogProps> = {}) {
  const onAssign = jest.fn()
  const onClose = jest.fn()
  render(
    <AssignJobDialog
      open
      technician={technician}
      jobs={[plumbingJob, electricalJob]}
      loading={false}
      submitting={false}
      error={null}
      onClose={onClose}
      onAssign={onAssign}
      {...props}
    />,
  )
  return { onAssign, onClose }
}

const jobOptions = () => within(screen.getByRole('list', { name: 'Available jobs' })).getAllByRole('button')

describe('AssignJobDialog', () => {
  it('lists jobs matching the technician skills first', () => {
    renderDialog()

    const options = jobOptions()
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('Replace breaker panel')
    expect(options[0]).toHaveTextContent('Skill match')
    expect(options[1]).toHaveTextContent('Fix leaking pipe')
    expect(options[1]).not.toHaveTextContent('Skill match')
  })

  it('enables assigning once a job is selected and passes that job to onAssign', async () => {
    const user = userEvent.setup()
    const { onAssign } = renderDialog()

    const assignButton = screen.getByRole('button', { name: 'Assign job' })
    expect(assignButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Fix leaking pipe/ }))
    expect(screen.getByRole('button', { name: /Fix leaking pipe/ })).toHaveAttribute('aria-pressed', 'true')
    expect(assignButton).toBeEnabled()

    await user.click(assignButton)
    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith(plumbingJob)
  })

  it('filters jobs by search term', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole('textbox', { name: 'Search jobs' }), 'grace')
    const options = jobOptions()
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Fix leaking pipe')

    await user.clear(screen.getByRole('textbox', { name: 'Search jobs' }))
    await user.type(screen.getByRole('textbox', { name: 'Search jobs' }), 'no such job')
    expect(screen.queryByRole('list', { name: 'Available jobs' })).not.toBeInTheDocument()
    expect(screen.getByText('No jobs match your search.')).toBeInTheDocument()
  })

  it('shows an empty state when there are no unassigned jobs', () => {
    renderDialog({ jobs: [] })

    expect(screen.getByText('No unassigned jobs available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign job' })).toBeDisabled()
  })

  it('shows the error message in an alert', () => {
    renderDialog({ error: 'Job is already assigned' })

    expect(screen.getByRole('alert')).toHaveTextContent('Job is already assigned')
  })

  it('cannot be dismissed while an assignment is submitting', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ submitting: true })

    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Assign job to Ada Lovelace' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Assigning…' })).toBeDisabled()
  })

  it('cannot assign a selected job once a search hides it', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: /Fix leaking pipe/ }))
    const assignButton = screen.getByRole('button', { name: 'Assign job' })
    expect(assignButton).toBeEnabled()

    const search = screen.getByRole('textbox', { name: 'Search jobs' })
    await user.type(search, 'breaker')
    expect(jobOptions()).toHaveLength(1)
    expect(assignButton).toBeDisabled()

    await user.clear(search)
    expect(assignButton).toBeEnabled()
  })
})
