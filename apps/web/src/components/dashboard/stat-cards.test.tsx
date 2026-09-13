import { render, screen, within } from '@testing-library/react'
import { computeStats, StatCards } from '@/components/dashboard/stat-cards'
import type { Job, Priority, Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

function technician(id: string, assignedJobCount: number): Technician {
  return {
    id,
    name: `Technician ${id}`,
    email: `${id}@crewboard.test`,
    phone: '555-0100',
    designation: 'Field Technician',
    region: 'North',
    skills: ['HVAC'],
    specialties: [makeSpecialty('HVAC', 'Trades')],
    location: makeLocation('North'),
    assignedJobCount,
  }
}

function job(id: string, priority: Priority): Job {
  return {
    id,
    title: `Job ${id}`,
    description: 'Routine service',
    customerName: 'Acme Co',
    address: '1 Main St',
    requiredSkill: 'HVAC',
    skill: makeSpecialty('HVAC', 'Trades'),
    location: makeLocation('Surrey'),
    priority,
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: null,
    assignedAt: null,
  }
}

const technicians = [technician('a', 0), technician('b', 2), technician('c', 5), technician('d', 6), technician('e', 1)]
const unassignedJobs = [job('1', 'URGENT'), job('2', 'HIGH'), job('3', 'URGENT')]

describe('computeStats', () => {
  it('summarizes technicians and unassigned jobs', () => {
    expect(computeStats(technicians, unassignedJobs)).toEqual({
      technicianCount: 5,
      availableTechnicianCount: 1,
      assignedJobCount: 14,
      averageJobsPerTechnician: 2.8,
      unassignedJobCount: 3,
      urgentUnassignedJobCount: 2,
      heavyWorkloadCount: 2,
    })
  })

  it('rounds the average to one decimal', () => {
    expect(computeStats([technician('a', 1), technician('b', 1), technician('c', 0)], []).averageJobsPerTechnician).toBe(
      0.7,
    )
  })

  it('returns zeros for empty data instead of dividing by zero', () => {
    expect(computeStats([], [])).toEqual({
      technicianCount: 0,
      availableTechnicianCount: 0,
      assignedJobCount: 0,
      averageJobsPerTechnician: 0,
      unassignedJobCount: 0,
      urgentUnassignedJobCount: 0,
      heavyWorkloadCount: 0,
    })
  })
})

describe('StatCards', () => {
  const card = (name: string) => screen.getByRole('group', { name })
  const skeletons = (element: HTMLElement) => element.querySelectorAll('[data-slot="skeleton"]')

  it('renders each stat with its hint', () => {
    render(<StatCards technicians={technicians} unassignedJobs={unassignedJobs} />)

    expect(within(card('Technicians')).getByText('5')).toBeInTheDocument()
    expect(within(card('Technicians')).getByText('1 available')).toBeInTheDocument()
    expect(within(card('Assigned jobs')).getByText('14')).toBeInTheDocument()
    expect(within(card('Assigned jobs')).getByText('2.8 avg per technician')).toBeInTheDocument()
    expect(within(card('Unassigned jobs')).getByText('3')).toBeInTheDocument()
    expect(within(card('Heavy workload')).getByText('2')).toBeInTheDocument()
    expect(within(card('Heavy workload')).getByText('at 5+ jobs')).toBeInTheDocument()
  })

  it('emphasizes urgent unassigned jobs', () => {
    render(<StatCards technicians={technicians} unassignedJobs={unassignedJobs} />)

    expect(within(card('Unassigned jobs')).getByText('2 urgent')).toHaveClass('text-destructive', 'font-medium')
  })

  it('stays muted when no unassigned job is urgent', () => {
    render(<StatCards technicians={technicians} unassignedJobs={[job('1', 'LOW')]} />)

    const hint = within(card('Unassigned jobs')).getByText('None urgent')
    expect(hint).toHaveClass('text-muted-foreground')
    expect(hint).not.toHaveClass('text-destructive')
  })

  it('shows skeletons for every card while data is loading', () => {
    render(<StatCards />)

    for (const name of ['Technicians', 'Assigned jobs', 'Unassigned jobs', 'Heavy workload']) {
      expect(skeletons(card(name))).toHaveLength(2)
      expect(card(name)).toHaveAttribute('aria-busy', 'true')
    }
  })

  it('loads the technician cards and the unassigned card independently', () => {
    render(<StatCards unassignedJobs={unassignedJobs} />)

    expect(skeletons(card('Technicians'))).toHaveLength(2)
    expect(skeletons(card('Assigned jobs'))).toHaveLength(2)
    expect(skeletons(card('Heavy workload'))).toHaveLength(2)
    expect(skeletons(card('Unassigned jobs'))).toHaveLength(0)
    expect(within(card('Unassigned jobs')).getByText('3')).toBeInTheDocument()
  })
})
