import type { Location } from '@/lib/types'

export function formatLocation(location: Location, detail: 'city' | 'full' = 'city'): string {
  if (detail === 'city') return location.city.name
  return `${location.city.name}, ${location.region.name}, ${location.province.code}`
}

/** The narrowest area two locations share. */
export type Proximity = 'city' | 'region' | 'province'

// Compares ids rather than names: different regions can have cities with the same name.
export function proximity(a: Location, b: Location): Proximity | null {
  if (a.province.code !== b.province.code) return null
  if (a.region.id !== b.region.id) return 'province'
  if (a.city.id !== b.city.id) return 'region'
  return 'city'
}
