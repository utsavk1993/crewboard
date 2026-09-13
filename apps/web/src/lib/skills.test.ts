import { groupSpecialties, skillMatch } from '@/lib/skills'
import { makeSpecialty } from '@/test/factories'

const heatPumps = makeSpecialty('Heat Pumps', 'HVAC')
const furnaces = makeSpecialty('Furnaces', 'HVAC')
const panels = makeSpecialty('Panel Upgrades', 'Electrical')
const wiring = makeSpecialty('Wiring', 'Electrical')
const drains = makeSpecialty('Drain Cleaning', 'Plumbing')

describe('groupSpecialties', () => {
  it('groups specialties under their category, sorting both by name', () => {
    expect(groupSpecialties([heatPumps, wiring, furnaces, panels])).toEqual([
      { category: panels.category, specialties: [panels, wiring] },
      { category: furnaces.category, specialties: [furnaces, heatPumps] },
    ])
  })

  it('lists a specialty once even when it appears more than once', () => {
    expect(groupSpecialties([wiring, wiring, { ...wiring }])).toEqual([
      { category: wiring.category, specialties: [wiring] },
    ])
  })

  it('returns no groups for no specialties', () => {
    expect(groupSpecialties([])).toEqual([])
  })

  it('does not reorder the array it was given', () => {
    const specialties = [wiring, panels]

    groupSpecialties(specialties)

    expect(specialties).toEqual([wiring, panels])
  })
})

describe('skillMatch', () => {
  const technician = { specialties: [furnaces, wiring] }

  it('matches the specialty when the technician has the exact skill', () => {
    expect(skillMatch(technician, { skill: wiring })).toBe('specialty')
  })

  it('matches the category when the technician only has a related specialty', () => {
    expect(skillMatch(technician, { skill: heatPumps })).toBe('category')
  })

  it('does not match a skill from a category the technician lacks', () => {
    expect(skillMatch(technician, { skill: drains })).toBeNull()
  })

  it('does not match a technician with no specialties', () => {
    expect(skillMatch({ specialties: [] }, { skill: wiring })).toBeNull()
  })

  it('compares by id, not by name', () => {
    const renamed = { ...wiring, name: 'Rewiring' }
    const sameNameOtherCategory = makeSpecialty('Wiring', 'Low Voltage')

    expect(skillMatch(technician, { skill: renamed })).toBe('specialty')
    expect(skillMatch(technician, { skill: sameNameOtherCategory })).toBeNull()
  })
})
