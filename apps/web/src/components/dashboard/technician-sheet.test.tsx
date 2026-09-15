import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TechnicianSheet, type TechnicianSheetProps } from '@/components/dashboard/technician-sheet'
import { formatDate } from '@/lib/format'
import type { Job, Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

const technician: Technician = {
  id: 't1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '604-555-0100',
  designation: 'Senior Technician',
  region: 'Metro Vancouver',
  skills: ['EV Chargers', 'Panel Upgrades', 'Heat Pumps'],
  specialties: [
    makeSpecialty('EV Chargers', 'Electrical'),
    makeSpecialty('Panel Upgrades', 'Electrical'),
    makeSpecialty('Heat Pumps', 'HVAC'),
  ],
  location: makeLocation('Surrey'),
  assignedJobCount: 2,
  hiredOn: '2019-03-14T00:00:00.000Z',
}

const jobs: Job[] = [
  {
    id: 'j1',
    title: 'Upgrade electrical panel',
    description: '',
    customerName: 'Alan Turing',
    address: '8120 No. 3 Rd, Richmond, BC V6Y 2C4',
    requiredSkill: 'Panel Upgrades',
    skill: makeSpecialty('Panel Upgrades', 'Electrical'),
    location: makeLocation('Richmond'),
    priority: 'HIGH',
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: 't1',
    assignedAt: '2026-09-10T09:00:00.000Z',
  },
  {
    id: 'j2',
    title: 'Heat pump short cycling',
    description: '',
    customerName: 'Grace Hopper',
    address: '4700 Kingsway, Burnaby, BC V5H 4M1',
    requiredSkill: 'Heat Pumps',
    skill: makeSpecialty('Heat Pumps', 'HVAC'),
    location: makeLocation('Burnaby'),
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

function assignedJobItems() {
  return within(screen.getByRole('list', { name: 'Assigned jobs' })).getAllByRole('listitem')
}

describe('TechnicianSheet', () => {
  it('shows technician details and assigned jobs, and unassigns the chosen job', async () => {
    const user = userEvent.setup()
    const { onUnassign } = renderSheet()

    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByText('Senior Technician')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ada@example.com' })).toHaveAttribute('href', 'mailto:ada@example.com')
    expect(screen.getByRole('link', { name: '604-555-0100' })).toHaveAttribute('href', 'tel:604-555-0100')
    expect(screen.getByRole('meter', { name: 'Ada Lovelace workload' })).toBeInTheDocument()

    const items = assignedJobItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Upgrade electrical panel')
    expect(items[1]).toHaveTextContent('Heat pump short cycling')

    await user.click(within(items[1]).getByRole('button', { name: /^Unassign/ }))
    expect(onUnassign).toHaveBeenCalledTimes(1)
    expect(onUnassign).toHaveBeenCalledWith(jobs[1])
  })

  it('groups the technician’s skills by category', () => {
    renderSheet()

    const groups = screen.getAllByRole('group')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAccessibleName('Electrical')
    expect(groups[1]).toHaveAccessibleName('HVAC')

    const electrical = screen.getByRole('group', { name: 'Electrical' })
    expect(within(electrical).getByText('EV Chargers')).toBeInTheDocument()
    expect(within(electrical).getByText('Panel Upgrades')).toBeInTheDocument()
    expect(within(electrical).queryByText('Heat Pumps')).not.toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'HVAC' })).getByText('Heat Pumps')).toBeInTheDocument()
  })

  it('shows the technician’s full location instead of the legacy region', () => {
    renderSheet()

    expect(screen.getByRole('img', { name: 'Surrey, Metro Vancouver, BC' })).toBeInTheDocument()
  })

  it('shows each job’s category and specialty, city and scheduled date', () => {
    renderSheet()

    const [panel, heatPump] = assignedJobItems()
    expect(panel).toHaveTextContent('Alan Turing · 8120 No. 3 Rd, Richmond, BC V6Y 2C4')

    // The chevron between category and specialty is decorative; assistive tech hears a comma instead.
    const skill = within(panel).getByText('Panel Upgrades').parentElement!
    expect(skill).toHaveTextContent(/^Electrical, Panel Upgrades$/)
    skill.querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))

    expect(within(panel).getByText('Richmond')).toBeInTheDocument()
    expect(within(panel).getByText(`Scheduled ${formatDate(jobs[0].scheduledDate)}`)).toBeInTheDocument()

    expect(within(heatPump).getByText('Heat Pumps').parentElement).toHaveTextContent(/^HVAC, Heat Pumps$/)
    expect(within(heatPump).getByText('Burnaby')).toBeInTheDocument()
    expect(within(heatPump).getByText(`Scheduled ${formatDate(jobs[1].scheduledDate)}`)).toBeInTheDocument()
  })

  it('shows an empty state when no jobs are assigned', () => {
    renderSheet({ jobs: [], technician: { ...technician, assignedJobCount: 0 } })

    expect(screen.getByText('No jobs assigned yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Assigned jobs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Unassign/ })).not.toBeInTheDocument()
  })

  it('shows a spinner on the pending job and disables every unassign button', () => {
    renderSheet({ pendingJobId: 'j1' })

    const items = assignedJobItems()
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
