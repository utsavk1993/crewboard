import { getWorkloadLevel, WORKLOAD_CAPACITY, workloadLabels } from '@/lib/workload'

describe('getWorkloadLevel', () => {
  it.each([
    [0, 'available'],
    [1, 'light'],
    [2, 'light'],
    [3, 'steady'],
    [4, 'steady'],
    [5, 'heavy'],
    [6, 'heavy'],
    [9, 'heavy'],
  ] as const)('treats %i assigned jobs as %s', (count, level) => {
    expect(getWorkloadLevel(count)).toBe(level)
  })
})

describe('workloadLabels', () => {
  it('has a display label for every level', () => {
    expect(workloadLabels).toEqual({ available: 'Available', light: 'Light', steady: 'Steady', heavy: 'Heavy' })
  })
})

it('measures workload against a capacity of 6 jobs', () => {
  expect(WORKLOAD_CAPACITY).toBe(6)
})
