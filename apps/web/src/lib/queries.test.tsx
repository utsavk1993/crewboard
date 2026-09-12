import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { queryKeys, useSetAssignment } from '@/lib/queries'

const fetchMock = jest.fn()
const originalFetch = global.fetch

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterAll(() => {
  global.fetch = originalFetch
})

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(queryKeys.technicians, [])
  queryClient.setQueryData(queryKeys.unassignedJobs, [])
  queryClient.setQueryData(queryKeys.technicianJobs('t1'), [])

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useSetAssignment(), { wrapper })

  const isInvalidated = (queryKey: readonly unknown[]) =>
    queryClient.getQueryState(queryKey)?.isInvalidated

  return { result, isInvalidated }
}

describe('useSetAssignment', () => {
  it('invalidates technicians and all job lists after a successful assignment', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ id: 'j1' }) })
    const { result, isInvalidated } = setup()

    await result.current.mutateAsync({ jobId: 'j1', technicianId: 't1' })

    expect(isInvalidated(queryKeys.technicians)).toBe(true)
    expect(isInvalidated(queryKeys.unassignedJobs)).toBe(true)
    expect(isInvalidated(queryKeys.technicianJobs('t1'))).toBe(true)
  })

  it('invalidates technicians and all job lists when the assignment fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: { code: 'CONFLICT', message: 'Job is already assigned' } }),
    })
    const { result, isInvalidated } = setup()

    await expect(result.current.mutateAsync({ jobId: 'j1', technicianId: 't1' })).rejects.toThrow(
      'Job is already assigned',
    )

    expect(isInvalidated(queryKeys.technicians)).toBe(true)
    expect(isInvalidated(queryKeys.unassignedJobs)).toBe(true)
    expect(isInvalidated(queryKeys.technicianJobs('t1'))).toBe(true)
  })
})
