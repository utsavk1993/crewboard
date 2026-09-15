import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { TechniciansTable, type TechniciansTableProps } from '@/components/dashboard/technicians-table'
import type { Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

const alberta = { code: 'AB', name: 'Alberta' }

function technician(fields: Pick<Technician, 'id' | 'name'> & Partial<Technician>): Technician {
  const specialties = fields.specialties ?? [makeSpecialty('Furnaces', 'HVAC')]
  const location = fields.location ?? makeLocation('Vancouver')
  return {
    email: `${fields.id}@crewboard.test`,
    phone: '555-0100',
    designation: 'Field Technician',
    region: location.region.name,
    skills: specialties.map((specialty) => specialty.name),
    specialties,
    location,
    assignedJobCount: 0,
    hiredOn: '2019-03-14T00:00:00.000Z',
    ...fields,
  }
}

// Deliberately out of name order, with a workload tie between Ada and Katherine.
const technicians = [
  technician({
    id: 'grace',
    name: 'Grace Hopper',
    designation: 'Senior Technician',
    location: makeLocation('Burnaby'),
    specialties: [
      makeSpecialty('Refrigerators', 'Appliance Repair'),
      makeSpecialty('Dishwashers', 'Appliance Repair'),
      makeSpecialty('EV Chargers', 'Electrical'),
      makeSpecialty('Furnaces', 'HVAC'),
      makeSpecialty('Heat Pumps', 'HVAC'),
      makeSpecialty('Water Heaters', 'Plumbing'),
    ],
    assignedJobCount: 2,
  }),
  technician({
    id: 'katherine',
    name: 'Katherine Johnson',
    location: makeLocation('Calgary', 'Calgary Region', alberta),
    specialties: [makeSpecialty('Drains & Sewer', 'Plumbing')],
    assignedJobCount: 5,
  }),
  technician({
    id: 'alan',
    name: 'Alan Turing',
    designation: 'Installer',
    location: makeLocation('Kelowna', 'Central Okanagan'),
    specialties: [
      makeSpecialty('Security Cameras', 'Smart Home & Security'),
      makeSpecialty('Home Networking', 'Smart Home & Security'),
    ],
    assignedJobCount: 0,
  }),
  technician({
    id: 'ada',
    name: 'Ada Lovelace',
    location: makeLocation('Surrey'),
    specialties: [makeSpecialty('Air Conditioning', 'HVAC')],
    assignedJobCount: 5,
  }),
]

function ProfileRoute() {
  return <h1>Profile {useParams().technicianId}</h1>
}

function renderTable(props: Partial<TechniciansTableProps> = {}) {
  const onAssign = jest.fn()
  const onViewJobs = jest.fn()
  const view = render(
    <MemoryRouter>
      <Routes>
        <Route
          index
          element={
            <TechniciansTable
              technicians={technicians}
              loading={false}
              onAssign={onAssign}
              onViewJobs={onViewJobs}
              {...props}
            />
          }
        />
        <Route path="technicians/:technicianId" element={<ProfileRoute />} />
      </Routes>
    </MemoryRouter>,
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
    expect(searchInput()).toHaveAttribute('placeholder', 'Search name, skill, city…')
    expect(screen.getByRole('columnheader', { name: 'Technician' })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: 'Workload' })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('columnheader', { name: 'Location' })).not.toHaveAttribute('aria-sort')
    expect(screen.queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument()
  })

  it('shows each technician with their details, location and workload', () => {
    renderTable()

    const row = within(rowFor('Alan Turing'))
    expect(row.getByText('alan@crewboard.test')).toBeInTheDocument()
    expect(row.getByText('Installer')).toBeInTheDocument()
    expect(row.getByText('Kelowna')).toBeInTheDocument()
    expect(row.getByText('Central Okanagan')).toBeInTheDocument()
    expect(row.getByRole('meter', { name: 'Alan Turing workload' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows a badge for two skill categories and summarizes the rest', () => {
    renderTable()

    const row = within(rowFor('Grace Hopper'))
    expect(row.getByRole('button', { name: 'Appliance Repair: Dishwashers, Refrigerators' })).toBeInTheDocument()
    expect(row.getByRole('button', { name: 'Electrical: EV Chargers' })).toBeInTheDocument()
    expect(row.queryByText('HVAC')).not.toBeInTheDocument()
    expect(
      row.getByRole('button', { name: '+2 more categories: HVAC: Furnaces, Heat Pumps; Plumbing: Water Heaters' }),
    ).toBeInTheDocument()
    expect(within(rowFor('Alan Turing')).getByRole('button', { name: /^Smart Home & Security:/ })).toBeInTheDocument()
  })

  it("lists a category's specialties when its badge is hovered", async () => {
    const { user } = renderTable()

    await user.hover(within(rowFor('Grace Hopper')).getByRole('button', { name: /^Appliance Repair:/ }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Dishwashers, Refrigerators')
  })

  it('lists the remaining categories and their specialties when the overflow badge is focused', async () => {
    renderTable()

    const overflow = within(rowFor('Grace Hopper')).getByRole('button', { name: /^\+2 more categories/ })
    act(() => overflow.focus())

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('HVAC')
    expect(tooltip).toHaveTextContent('Furnaces, Heat Pumps')
    expect(tooltip).toHaveTextContent('Plumbing')
    expect(tooltip).toHaveTextContent('Water Heaters')
  })

  it('filters by specialty, including ones hidden behind the overflow badge', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), 'water heaters')

    expect(rowNames()).toEqual(['Grace Hopper'])
    expect(resultCount()).toHaveTextContent('1 of 4 technicians')
  })

  it('filters by skill category', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), 'plumbing')

    expect(rowNames()).toEqual(['Grace Hopper', 'Katherine Johnson'])
    expect(resultCount()).toHaveTextContent('2 of 4 technicians')
  })

  it('filters by city, ignoring case and surrounding spaces', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), '  KELOWNA ')

    expect(rowNames()).toEqual(['Alan Turing'])
    expect(resultCount()).toHaveTextContent('1 of 4 technicians')
  })

  it('filters by region and province', async () => {
    const { user } = renderTable()

    await user.type(searchInput(), 'metro vancouver')
    expect(rowNames()).toEqual(['Ada Lovelace', 'Grace Hopper'])

    await user.clear(searchInput())
    await user.type(searchInput(), 'alberta')
    expect(rowNames()).toEqual(['Katherine Johnson'])
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

  it('links each technician’s name to their profile', async () => {
    const { user } = renderTable()

    const row = within(rowFor('Alan Turing'))
    const link = row.getByRole('link', { name: 'Alan Turing' })
    expect(link).toHaveAttribute('href', '/technicians/alan')
    expect(row.queryByRole('link', { name: 'alan@crewboard.test' })).not.toBeInTheDocument()

    await user.click(link)

    expect(screen.getByRole('heading', { name: 'Profile alan' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Technicians' })).not.toBeInTheDocument()
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
