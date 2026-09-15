// Mirrors the JSON returned by the API (apps/api/src/routes).

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface SkillCategory {
  id: string
  name: string
}

export interface Specialty {
  id: string
  name: string
  category: SkillCategory
}

export interface Place {
  id: string
  name: string
}

export interface Location {
  city: Place
  region: Place
  province: { code: string; name: string }
}

export interface Technician {
  id: string
  name: string
  email: string
  phone: string
  designation: string
  region: string
  skills: string[]
  // Sorted by category, then specialty.
  specialties: Specialty[]
  location: Location
  assignedJobCount: number
  // A calendar date, sent as midnight UTC.
  hiredOn: string
}

export interface Job {
  id: string
  title: string
  description: string
  customerName: string
  address: string
  requiredSkill: string
  skill: Specialty
  location: Location
  priority: Priority
  scheduledDate: string
  technicianId: string | null
  assignedAt: string | null
}
