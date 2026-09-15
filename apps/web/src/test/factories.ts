import type { Job, Location, Specialty, Technician } from '@/lib/types'

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Ids derive from names so fixtures built separately still compare equal, like rows from the API.
// A specialty's id includes its category because the same name can appear under two categories.
export function makeSpecialty(name: string, category: string): Specialty {
  return {
    id: `specialty-${slug(category)}-${slug(name)}`,
    name,
    category: { id: `category-${slug(category)}`, name: category },
  }
}

export function makeLocation(
  city: string,
  region = 'Metro Vancouver',
  province = { code: 'BC', name: 'British Columbia' },
): Location {
  return {
    city: { id: `city-${slug(city)}`, name: city },
    region: { id: `region-${slug(region)}`, name: region },
    province,
  }
}

// Legacy `skills` and `region` follow the specialties and location, as the API derives them.
export function makeTechnician(overrides: Partial<Technician> = {}): Technician {
  const name = overrides.name ?? 'Ada Lovelace'
  const specialties = overrides.specialties ?? [makeSpecialty('Panel Upgrades', 'Electrical')]
  const location = overrides.location ?? makeLocation('Surrey')
  return {
    id: slug(name),
    name,
    email: `${slug(name)}@crewboard.test`,
    phone: '604-555-0100',
    designation: 'Field Technician',
    region: location.city.name,
    skills: specialties.map((specialty) => specialty.name),
    specialties,
    location,
    assignedJobCount: 0,
    hiredOn: '2019-03-14T00:00:00.000Z',
    ...overrides,
  }
}

export function makeJob(overrides: Partial<Job> = {}): Job {
  const title = overrides.title ?? 'Upgrade electrical panel'
  const skill = overrides.skill ?? makeSpecialty('Panel Upgrades', 'Electrical')
  return {
    id: slug(title),
    title,
    description: '',
    customerName: 'Grace Hopper',
    address: '1 Main St',
    requiredSkill: skill.name,
    skill,
    location: makeLocation('Surrey'),
    priority: 'MEDIUM',
    scheduledDate: '2026-09-15T00:00:00.000Z',
    technicianId: null,
    assignedAt: null,
    ...overrides,
  }
}
