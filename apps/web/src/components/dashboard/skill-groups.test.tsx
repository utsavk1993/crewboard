import { render, screen, within } from '@testing-library/react'
import { SkillGroups } from '@/components/dashboard/skill-groups'
import { makeSpecialty } from '@/test/factories'

const specialties = [
  makeSpecialty('Heat Pumps', 'HVAC'),
  makeSpecialty('Wiring', 'Electrical'),
  makeSpecialty('Furnaces', 'HVAC'),
  makeSpecialty('Panel Upgrades', 'Electrical'),
]

describe('SkillGroups', () => {
  it('shows each category as a labelled group, sorted by name', () => {
    render(<SkillGroups specialties={specialties} />)

    const groups = screen.getAllByRole('group')

    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAccessibleName('Electrical')
    expect(groups[1]).toHaveAccessibleName('HVAC')
  })

  it('lists the specialties of each category, sorted by name', () => {
    render(<SkillGroups specialties={specialties} />)

    const hvac = screen.getByRole('group', { name: 'HVAC' })
    const badges = hvac.querySelectorAll('[data-slot="badge"]')

    expect([...badges].map((badge) => badge.textContent)).toEqual(['Furnaces', 'Heat Pumps'])
    expect(within(hvac).queryByText('Wiring')).not.toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Electrical' })).getByText('Wiring')).toBeInTheDocument()
  })

  it('says when there are no skills', () => {
    render(<SkillGroups specialties={[]} />)

    expect(screen.getByText('No skills listed')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('accepts a class name', () => {
    const { container } = render(<SkillGroups specialties={specialties} className="mt-4" />)

    expect(container.firstChild).toHaveClass('mt-4', 'flex-col')
  })
})
