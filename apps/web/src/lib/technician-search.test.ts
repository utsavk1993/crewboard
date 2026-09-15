import { matchesTechnicianSearch } from '@/lib/technician-search'
import { makeLocation, makeSpecialty } from '@/test/factories'

const technician = {
  name: 'Grace Hopper',
  email: 'grace@crewboard.test',
  designation: 'Senior Technician',
  specialties: [makeSpecialty('Water Heaters', 'Plumbing'), makeSpecialty('Dishwashers', 'Appliance Repair')],
  location: makeLocation('Calgary', 'Calgary Region', { code: 'AB', name: 'Alberta' }),
}

describe('matchesTechnicianSearch', () => {
  it.each([
    ['name', 'hopper'],
    ['email', 'grace@'],
    ['designation', 'senior'],
    ['specialty', 'water heat'],
    ['category', 'appliance'],
    ['city', 'calgary'],
    ['region', 'calgary region'],
    ['province name', 'alberta'],
    ['province code', 'AB'],
  ])('matches by %s', (_field, term) => {
    expect(matchesTechnicianSearch(technician, term)).toBe(true)
  })

  it('ignores case and surrounding spaces', () => {
    expect(matchesTechnicianSearch(technician, '  DISHWASHERS ')).toBe(true)
  })

  it('matches everyone when the term is blank', () => {
    expect(matchesTechnicianSearch(technician, '')).toBe(true)
    expect(matchesTechnicianSearch(technician, '   ')).toBe(true)
  })

  it('rejects a term no field contains', () => {
    expect(matchesTechnicianSearch(technician, 'vancouver')).toBe(false)
    expect(matchesTechnicianSearch(technician, 'electrical')).toBe(false)
  })
})
