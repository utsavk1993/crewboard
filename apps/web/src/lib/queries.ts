import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const queryKeys = {
  technicians: ['technicians'] as const,
  jobs: ['jobs'] as const,
  unassignedJobs: ['jobs', 'unassigned'] as const,
  technicianJobs: (technicianId: string) => ['jobs', 'technician', technicianId] as const,
}

export function useTechnicians() {
  return useQuery({ queryKey: queryKeys.technicians, queryFn: api.getTechnicians })
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
