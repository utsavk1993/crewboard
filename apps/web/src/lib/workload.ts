// Workload meters fill against this many jobs; counts above it render as a full bar.
export const WORKLOAD_CAPACITY = 6

export type WorkloadLevel = 'available' | 'light' | 'steady' | 'heavy'

export function getWorkloadLevel(count: number): WorkloadLevel {
  if (count <= 0) return 'available'
  if (count <= 2) return 'light'
  if (count <= 4) return 'steady'
  return 'heavy'
}

export const workloadLabels: Record<WorkloadLevel, string> = {
  available: 'Available',
  light: 'Light',
  steady: 'Steady',
  heavy: 'Heavy',
}
