import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export const queryKeys = {
  technicians: ['technicians'] as const,
  // Nested under `technicians`, so anything that refreshes the list refreshes each profile too.
  technician: (technicianId: string) => ['technicians', technicianId] as const,
  jobs: ['jobs'] as const,
  unassignedJobs: ['jobs', 'unassigned'] as const,
  technicianJobs: (technicianId: string) => ['jobs', 'technician', technicianId] as const,
}

// Retries once, but not client errors: a 404 or a 400 will fail the same way again.
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

export function useTechnicians() {
  return useQuery({ queryKey: queryKeys.technicians, queryFn: api.getTechnicians })
}

export function useTechnician(technicianId: string) {
  return useQuery({ queryKey: queryKeys.technician(technicianId), queryFn: () => api.getTechnician(technicianId) })
}

export function useUnassignedJobs() {
  return useQuery({ queryKey: queryKeys.unassignedJobs, queryFn: api.getUnassignedJobs })
}

export function useTechnicianJobs(technicianId: string | null) {
  return useQuery({
    queryKey: queryKeys.technicianJobs(technicianId ?? ''),
    queryFn: () => api.getTechnicianJobs(technicianId!),
    enabled: technicianId !== null,
  })
}

export function useSetAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, technicianId }: { jobId: string; technicianId: string | null }) =>
      api.setAssignment(jobId, technicianId),
    // Assigning changes job counts and both job lists. Refetch on failure too: a 409 means
    // the lists are stale. Returning the promise makes mutateAsync resolve after the refetch.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.technicians }),
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs }),
      ]),
  })
}
