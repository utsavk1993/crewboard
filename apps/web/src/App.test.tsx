import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { App } from '@/App'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { api, ApiError } from '@/lib/api'
import type { Job, Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getTechnicians: jest.fn(),
    getUnassignedJobs: jest.fn(),
    getTechnicianJobs: jest.fn(),
    setAssignment: jest.fn(),
  },
}))

const mockApi = jest.mocked(api)

function makeJob(fields: Pick<Job, 'id' | 'title' | 'requiredSkill'> & Partial<Job>): Job {
  return {
    description: '',
    customerName: 'Grace Hopper',
    address: '1 Main St',
    skill: makeSpecialty(fields.requiredSkill, 'Trades'),
    location: makeLocation('Surrey'),
    priority: 'MEDIUM',
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: null,
    assignedAt: null,
    ...fields,
  }
}

const ada: Technician = {
  id: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@crewboard.test',
  phone: '555-0100',
  designation: 'Senior Technician',
  region: 'North',
  skills: ['Electrical'],
  specialties: [makeSpecialty('Electrical', 'Trades')],
  location: makeLocation('North'),
  assignedJobCount: 1,
}
const alan: Technician = { ...ada, id: 'alan', name: 'Alan Turing', email: 'alan@crewboard.test', assignedJobCount: 0 }

// A tiny in-memory API so assignments change what the next refetch returns, like the real server.
let jobs: Job[]

function technicianRows(): Technician[] {
  return [ada, alan].map((t) => ({ ...t, assignedJobCount: jobs.filter((job) => job.technicianId === t.id).length }))
}

beforeEach(() => {
  jobs = [
    makeJob({ id: 'ac', title: 'Service AC unit', requiredSkill: 'HVAC', technicianId: 'ada', assignedAt: '2026-09-10T09:00:00.000Z' }),
    makeJob({ id: 'breaker', title: 'Replace breaker panel', requiredSkill: 'Electrical', priority: 'URGENT' }),
  ]
  mockApi.getTechnicians.mockImplementation(async () => technicianRows())
  mockApi.getUnassignedJobs.mockImplementation(async () => jobs.filter((job) => job.technicianId === null))
  mockApi.getTechnicianJobs.mockImplementation(async (id) => jobs.filter((job) => job.technicianId === id))
  mockApi.setAssignment.mockImplementation(async (jobId, technicianId) => {
    jobs = jobs.map((job) => (job.id === jobId ? { ...job, technicianId } : job))
    return jobs.find((job) => job.id === jobId)!
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </QueryClientProvider>
        <Toaster />
      </ThemeProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const workload = (name: string) => screen.getByRole('meter', { name: `${name} workload` })

describe('App', () => {
  it('shows the header, stats and a row per technician from the API', async () => {
    renderApp()

    expect(screen.getByRole('banner')).toHaveTextContent('Crewboard')
    expect(screen.getByRole('heading', { name: 'Dispatch board', level: 1 })).toBeInTheDocument()
    expect(document.title).toBe('Dispatch board · Crewboard')

    const table = await screen.findByRole('table', { name: 'Technicians' })
    expect(await within(table).findByText('Ada Lovelace')).toBeInTheDocument()
    expect(within(table).getByText('Alan Turing')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Unassigned jobs' })).getByText('1 urgent')).toBeInTheDocument()
  })

  it('assigns a job from the dialog and refreshes the workload', async () => {
    const user = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Assign job to Ada Lovelace' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: /Replace breaker panel/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Assign job' }))

    expect(mockApi.setAssignment).toHaveBeenCalledWith('breaker', 'ada')
    expect(await screen.findByText('Assigned “Replace breaker panel” to Ada Lovelace')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(workload('Ada Lovelace')).toHaveAttribute('aria-valuenow', '2'))
  })

  it('keeps the dialog open with the error when the job was taken meanwhile', async () => {
    mockApi.setAssignment.mockRejectedValueOnce(
      new ApiError('This job is already assigned to another technician.', 409, 'JOB_ALREADY_ASSIGNED'),
    )
    const user = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Assign job to Alan Turing' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: /Replace breaker panel/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Assign job' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'This job is already assigned to another technician.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('unassigns a job from the technician sheet', async () => {
    const user = renderApp()

    await user.click(await screen.findByRole('button', { name: 'View jobs for Ada Lovelace' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(await within(sheet).findByRole('button', { name: /Unassign Service AC unit/ }))

    expect(mockApi.setAssignment).toHaveBeenCalledWith('ac', null)
    expect(await screen.findByText('Unassigned “Service AC unit”')).toBeInTheDocument()
    expect(await within(sheet).findByText('No jobs assigned yet.')).toBeInTheDocument()
  })

  it('offers a retry when technicians fail to load', async () => {
    mockApi.getTechnicians.mockRejectedValueOnce(new ApiError('Something went wrong. Please try again.', 500))
    const user = renderApp()

    expect(await screen.findByText("Couldn't load technicians")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('table', { name: 'Technicians' })).toBeInTheDocument()
    expect(mockApi.getTechnicians).toHaveBeenCalledTimes(2)
  })

  it('shows a not-found page for unknown paths with a link back to the board', async () => {
    const user = renderApp('/no-such-page')

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page not found', level: 1 })).toBeInTheDocument()
    expect(document.title).toBe('Page not found · Crewboard')
    expect(mockApi.getTechnicians).not.toHaveBeenCalled()

    await user.click(screen.getByRole('link', { name: 'Back to dispatch board' }))

    expect(screen.getByRole('heading', { name: 'Dispatch board', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Technicians' })).toBeInTheDocument()
    expect(document.title).toBe('Dispatch board · Crewboard')
  })

  it('returns to the board from the header brand', async () => {
    const user = renderApp('/technicians/unknown/extra')

    await user.click(screen.getByRole('link', { name: 'Crewboard home' }))

    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Technicians' })).toBeInTheDocument()
  })
})
