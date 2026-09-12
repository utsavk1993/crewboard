// Mirrors the JSON returned by the API (apps/api/src/routes).

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Technician {
  id: string
  name: string
  email: string
  phone: string
  designation: string
  region: string
  skills: string[]
  assignedJobCount: number
}

export interface Job {
  id: string
  title: string
  description: string
  customerName: string
  address: string
  requiredSkill: string
  priority: Priority
  scheduledDate: string
  technicianId: string | null
  assignedAt: string | null
}
