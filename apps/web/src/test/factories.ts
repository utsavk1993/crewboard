import type { Location, Specialty } from '@/lib/types'

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
