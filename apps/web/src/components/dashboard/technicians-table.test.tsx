import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TechniciansTable, type TechniciansTableProps } from '@/components/dashboard/technicians-table'
import type { Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

function technician(fields: Pick<Technician, 'id' | 'name'> & Partial<Technician>): Technician {
  const region = fields.region ?? 'North'
  const skills = fields.skills ?? ['HVAC']
  return {
    email: `${fields.id}@crewboard.test`,
    phone: '555-0100',
    designation: 'Field Technician',
    region,
    skills,
    specialties: skills.map((skill) => makeSpecialty(skill, 'Trades')),
    location: makeLocation(region),
    assignedJobCount: 0,
    ...fields,
  }
}

// Deliberately out of name order, with a workload tie between Ada and Katherine.
const technicians = [
  technician({
    id: 'grace',
    name: 'Grace Hopper',
    designation: 'Senior Technician',
    region: 'East',
    skills: ['Electrical', 'HVAC', 'Plumbing', 'Solar'],
    assignedJobCount: 2,
  }),
  technician({ id: 'katherine', name: 'Katherine Johnson', region: 'South', skills: ['Plumbing'], assignedJobCount: 5 }),
  technician({
    id: 'alan',
    name: 'Alan Turing',
    designation: 'Installer',
    region: 'West',
    skills: ['Networking', 'Security'],
    assignedJobCount: 0,
  }),
  technician({ id: 'ada', name: 'Ada Lovelace', region: 'North', skills: ['HVAC'], assignedJobCount: 5 }),
]

function renderTable(props: Partial<TechniciansTableProps> = {}) {
  const onAssign = jest.fn()
  const onViewJobs = jest.fn()
  const view = render(
    <TechniciansTable
      technicians={technicians}
      loading={false}
      onAssign={onAssign}
      onViewJobs={onViewJobs}
      {...props}
    />,
  )
  return { ...view, onAssign, onViewJobs, user: userEvent.setup() }
}

const tableBody = () => within(screen.getByRole('table', { name: 'Technicians' })).getAllByRole('rowgroup')[1]
const bodyRows = () => within(tableBody()).queryAllByRole('row')
const rowNames = () =>
  bodyRows().map((row) => technicians.find((tech) => within(row).queryByText(tech.name))?.name)
const rowFor = (name: string) => bodyRows().find((row) => within(row).queryByText(name))!
const searchInput = () => screen.getByRole('searchbox', { name: 'Search technicians' })
const resultCount = () => screen.getByText(/technicians?$/, { selector: '[aria-live="polite"]' })

describe('TechniciansTable', () => {
  it('renders a row per technician, sorted by name', () => {
    renderTable()

    expect(rowNames()).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson'])
    expect(resultCount()).toHaveTextContent('4 technicians')
    expect(screen.getByRole('columnheader', { name: 'Technician' })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: 'Workload' })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('columnheader', { name: 'Region' })).not.toHaveAttribute('aria-sort')
  })

  it('shows each technician with their details and workload', () => {
    renderTable()

    const row = within(rowFor('Alan Turing'))
    expect(row.getByText('alan@crewboard.test')).toBeInTheDocument()
    expect(row.getByText('Installer')).toBeInTheDocument()
    expect(row.getByText('West')).toBeInTheDocument()
    expect(row.getByRole('meter', { name: 'Alan Turing workload' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows two skills and summarizes the rest', () => {
    renderTable()

    const row = within(rowFor('Grace Hopper'))
    expect(row.getByText('Electrical')).toBeInTheDocument()
    expect(row.getByText('HVAC')).toBeInTheDocument()
    expect(row.queryByText('Plumbing')).not.toBeInTheDocument()
    expect(row.getByRole('button', { name: '+2 more skills: Plumbing, Solar' })).toBeInTheDocument()
  })

  it('filters by skill, including skills hidden behind the overflow badge', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), 'plumbing')

    expect(rowNames()).toEqual(['Grace Hopper', 'Katherine Johnson'])
    expect(resultCount()).toHaveTextContent('2 of 4 technicians')
  })

  it('filters by region, ignoring case and surrounding spaces', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), '  WEST ')

    expect(rowNames()).toEqual(['Alan Turing'])
    expect(resultCount()).toHaveTextContent('1 of 4 technicians')
  })

  it('filters by email and designation', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), 'katherine@')
    expect(rowNames()).toEqual(['Katherine Johnson'])

    await user.clear(searchInput())
    await user.type(searchInput(), 'senior')
    expect(rowNames()).toEqual(['Grace Hopper'])
  })

  it('shows a no-results state that clears the search', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), ' zzz')

    expect(screen.getByText('No technicians match “zzz”')).toBeInTheDocument()
    expect(rowNames()).toEqual([undefined])
    expect(resultCount()).toHaveTextContent('0 of 4 technicians')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(rowNames()).toHaveLength(4)
    expect(searchInput()).toHaveValue('')
    expect(searchInput()).toHaveFocus()
    expect(resultCount()).toHaveTextContent('4 technicians')
  })

  it('sorts by workload, heaviest first, breaking ties by name', async () => {
    const { user } = renderTable()

    await user.click(screen.getByRole('button', { name: 'Workload' }))

    expect(rowNames()).toEqual(['Ada Lovelace', 'Katherine Johnson', 'Grace Hopper', 'Alan Turing'])
    expect(screen.getByRole('columnheader', { name: 'Workload' })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: 'Technician' })).toHaveAttribute('aria-sort', 'none')

    await user.click(screen.getByRole('button', { name: 'Workload' }))

    expect(rowNames()).toEqual(['Alan Turing', 'Grace Hopper', 'Ada Lovelace', 'Katherine Johnson'])
    expect(screen.getByRole('columnheader', { name: 'Workload' })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('toggles the name sort', async () => {
    const { user } = renderTable()

    await user.click(screen.getByRole('button', { name: 'Technician' }))

    expect(rowNames()).toEqual(['Katherine Johnson', 'Grace Hopper', 'Alan Turing', 'Ada Lovelace'])
    expect(screen.getByRole('columnheader', { name: 'Technician' })).toHaveAttribute('aria-sort', 'descending')
  })

  it('calls back with the technician from each row action', async () => {
    const { user, onAssign, onViewJobs } = renderTable()

    await user.click(screen.getByRole('button', { name: 'Assign job to Grace Hopper' }))
    expect(onAssign).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith(technicians[0])
    expect(onViewJobs).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'View jobs for Alan Turing' }))
    expect(onViewJobs).toHaveBeenCalledTimes(1)
    expect(onViewJobs).toHaveBeenCalledWith(technicians[2])
    expect(onAssign).toHaveBeenCalledTimes(1)
  })

  it('shows skeleton rows while loading', () => {
    const { container } = renderTable({ loading: true })

    expect(screen.getByRole('table', { name: 'Technicians' })).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('tbody tr')).toHaveLength(6)
    expect(container.querySelectorAll('tbody [data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(bodyRows()).toHaveLength(0)
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    expect(screen.queryByText(/technicians?$/, { selector: '[aria-live="polite"]' })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no technicians', () => {
    renderTable({ technicians: [] })

    expect(screen.getByText('No technicians yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    expect(resultCount()).toHaveTextContent('0 technicians')
  })
})
