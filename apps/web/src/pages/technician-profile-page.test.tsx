import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { App } from '@/App'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatMonthYear, formatTenure } from '@/lib/format'
import { makeJob, makeLocation, makeSpecialty, makeTechnician } from '@/test/factories'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getTechnicians: jest.fn(),
    getTechnician: jest.fn(),
    getUnassignedJobs: jest.fn(),
    getTechnicianJobs: jest.fn(),
    setAssignment: jest.fn(),
  },
}))

const mockApi = jest.mocked(api)

const ada = makeTechnician({
  id: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@crewboard.test',
  phone: '604-555-0100',
  designation: 'Senior Technician',
  specialties: [
    makeSpecialty('EV Chargers', 'Electrical'),
    makeSpecialty('Panel Upgrades', 'Electrical'),
    makeSpecialty('Heat Pumps', 'HVAC'),
  ],
  location: makeLocation('Surrey'),
  assignedJobCount: 3,
  hiredOn: '2019-03-14T00:00:00.000Z',
})

// Deliberately out of schedule order; one is long past, so it can't be the next scheduled job.
const jobs = [
  makeJob({
    id: 'charger',
    title: 'Install EV charger',
    skill: makeSpecialty('EV Chargers', 'Electrical'),
    location: makeLocation('Surrey'),
    priority: 'LOW',
    scheduledDate: '2099-02-01T00:00:00.000Z',
    technicianId: 'ada',
  }),
  makeJob({
    id: 'panel',
    title: 'Replace breaker panel',
    customerName: 'Alan Turing',
    address: '8120 No. 3 Rd, Richmond, BC V6Y 2C4',
    skill: makeSpecialty('Panel Upgrades', 'Electrical'),
    location: makeLocation('Richmond'),
    priority: 'HIGH',
    scheduledDate: '2001-01-01T00:00:00.000Z',
    technicianId: 'ada',
  }),
  makeJob({
    id: 'heat-pump',
    title: 'Service heat pump',
    skill: makeSpecialty('Heat Pumps', 'HVAC'),
    location: makeLocation('Burnaby'),
    priority: 'URGENT',
    scheduledDate: '2099-01-05T00:00:00.000Z',
    technicianId: 'ada',
  }),
]

beforeEach(() => {
  mockApi.getTechnicians.mockResolvedValue([ada])
  mockApi.getTechnician.mockImplementation(async (id) => {
    if (id !== ada.id) throw new ApiError('Technician not found.', 404, 'TECHNICIAN_NOT_FOUND')
    return ada
  })
  mockApi.getUnassignedJobs.mockResolvedValue([])
  mockApi.getTechnicianJobs.mockResolvedValue(jobs)
})

afterEach(() => {
  jest.clearAllMocks()
})

function renderApp(path = '/technicians/ada') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const profileHeading = () => screen.findByRole('heading', { name: 'Ada Lovelace', level: 1 })
const summary = () => screen.getByRole('complementary', { name: 'Technician summary' })
const card = (title: string) => within(summary()).getByRole('heading', { name: title }).closest('[data-slot="card"]') as HTMLElement

describe('TechnicianProfilePage', () => {
  it('shows the technician’s header, contact actions and details', async () => {
    renderApp()

    expect(await profileHeading()).toBeInTheDocument()
    expect(document.title).toBe('Ada Lovelace · Crewboard')
    expect(mockApi.getTechnician).toHaveBeenCalledWith('ada')
    expect(screen.getByText('Senior Technician')).toBeInTheDocument()
    expect(screen.getByText('Steady workload')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:ada@crewboard.test')
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:604-555-0100')

    const details = within(card('Details'))
    expect(details.getByRole('img', { name: 'Surrey, Metro Vancouver, BC' })).toBeInTheDocument()
    expect(details.getByText('Joined').nextElementSibling).toHaveTextContent(
      `${formatMonthYear(ada.hiredOn)} · ${formatTenure(ada.hiredOn)}`,
    )
    expect(details.getByRole('link', { name: 'ada@crewboard.test' })).toHaveAttribute('href', 'mailto:ada@crewboard.test')
    expect(details.getByRole('link', { name: '604-555-0100' })).toHaveAttribute('href', 'tel:604-555-0100')
  })

  it('groups the technician’s skills by category', async () => {
    renderApp()
    await profileHeading()

    const skills = within(card('Skills'))
    expect(skills.getByText('3 specialties')).toBeInTheDocument()
    expect(skills.getAllByRole('group').map((group) => group.textContent)).toEqual([
      'ElectricalEV ChargersPanel Upgrades',
      'HVACHeat Pumps',
    ])
    expect(skills.getByRole('group', { name: 'HVAC' })).toHaveTextContent('Heat Pumps')
  })

  it('summarizes the workload by priority with the next scheduled job', async () => {
    renderApp()
    await profileHeading()

    const workload = within(card('Workload'))
    expect(workload.getByRole('meter', { name: 'Ada Lovelace workload' })).toHaveAttribute('aria-valuenow', '3')
    expect(workload.getByText('assigned jobs')).toBeInTheDocument()

    const byPriority = await workload.findByRole('list', { name: 'Jobs by priority' })
    expect(within(byPriority).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Urgent1',
      'High1',
      'Medium0',
      'Low1',
    ])

    const next = workload.getByRole('heading', { name: 'Next scheduled job' }).parentElement!
    expect(next).toHaveTextContent('Service heat pump')
    expect(next).toHaveTextContent(formatDate('2099-01-05T00:00:00.000Z'))
  })

  it('lists assigned jobs by scheduled date with their details', async () => {
    renderApp()

    const list = await screen.findByRole('list', { name: 'Assigned jobs' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/^(Install|Replace|Service)/).textContent)).toEqual([
      'Replace breaker panel',
      'Service heat pump',
      'Install EV charger',
    ])

    const panel = within(items[0])
    expect(panel.getByText('High')).toBeInTheDocument()
    expect(items[0]).toHaveTextContent('Alan Turing · 8120 No. 3 Rd, Richmond, BC V6Y 2C4')
    expect(panel.getByText('Panel Upgrades').parentElement).toHaveTextContent(/^Electrical, Panel Upgrades$/)
    expect(panel.getByText('Richmond')).toBeInTheDocument()
    expect(panel.getByText(`Scheduled ${formatDate('2001-01-01T00:00:00.000Z')}`)).toBeInTheDocument()

    // Read-only: the profile doesn't change assignments.
    expect(within(list).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows empty states when the technician has no jobs', async () => {
    mockApi.getTechnician.mockResolvedValue({ ...ada, assignedJobCount: 0 })
    mockApi.getTechnicianJobs.mockResolvedValue([])
    renderApp()

    expect(await screen.findByText('No jobs assigned yet')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Assigned jobs' })).not.toBeInTheDocument()
    expect(screen.getByText('Available', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    expect(within(card('Workload')).getByText('Nothing scheduled')).toBeInTheDocument()
  })

  it('shows skeletons while the technician loads', () => {
    mockApi.getTechnician.mockReturnValue(new Promise(() => {}))
    renderApp()

    expect(screen.getByText('Loading technician')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(document.title).toBe('Technician · Crewboard')
    expect(screen.getByRole('link', { name: 'Dispatch board' })).toHaveAttribute('href', '/')
  })

  it('shows a not-found state with a way back for an unknown technician', async () => {
    const user = renderApp('/technicians/nobody')

    expect(await screen.findByRole('heading', { name: 'Technician not found', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to dispatch board' }))

    expect(screen.getByRole('heading', { name: 'Dispatch board', level: 1 })).toBeInTheDocument()
  })

  it('shows the error with a retry when the technician fails to load', async () => {
    mockApi.getTechnician.mockRejectedValueOnce(new ApiError('Something went wrong. Please try again.', 500))
    const user = renderApp()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load technician")
    expect(alert).toHaveTextContent('Something went wrong. Please try again.')

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await profileHeading()).toBeInTheDocument()
    expect(mockApi.getTechnician).toHaveBeenCalledTimes(2)
  })

  it('offers a retry when the assigned jobs fail to load', async () => {
    mockApi.getTechnicianJobs.mockRejectedValueOnce(new ApiError('Network error', 503))
    const user = renderApp()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load assigned jobs")
    expect(await profileHeading()).toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('list', { name: 'Assigned jobs' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens from a technician’s name on the board and links back to it', async () => {
    const user = renderApp('/')

    const table = await screen.findByRole('table', { name: 'Technicians' })
    await user.click(await within(table).findByRole('link', { name: 'Ada Lovelace' }))

    expect(await profileHeading()).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Dispatch board' }))

    expect(screen.getByRole('heading', { name: 'Dispatch board', level: 1 })).toBeInTheDocument()
  })
})
