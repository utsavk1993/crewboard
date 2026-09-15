import type { Technician } from '@/lib/types'

type SearchableTechnician = Pick<Technician, 'name' | 'email' | 'designation' | 'specialties' | 'location'>

// Everything a dispatcher might type to find someone: who they are, what they do and where they work.
export function technicianSearchFields({ name, email, designation, specialties, location }: SearchableTechnician) {
  return [
    name,
    email,
    designation,
    ...specialties.flatMap((specialty) => [specialty.name, specialty.category.name]),
    location.city.name,
    location.region.name,
    location.province.name,
    location.province.code,
  ]
}

/** Case-insensitive substring match on any searchable field; a blank term matches everyone. */
export function matchesTechnicianSearch(technician: SearchableTechnician, term: string): boolean {
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  return technicianSearchFields(technician).some((field) => field.toLowerCase().includes(needle))
}
