import type { Job, Technician } from '@/lib/types'

export class ApiError extends Error {
  name = 'ApiError'
  status: number
  code: string | undefined

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface ErrorBody {
  error?: { code?: unknown; message?: unknown }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body !== undefined && { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body: ErrorBody | null = await res.json().catch(() => null)
    const message = body?.error?.message
    const code = body?.error?.code
    throw new ApiError(
      typeof message === 'string' ? message : `Request failed (${res.status})`,
      res.status,
      typeof code === 'string' ? code : undefined,
    )
  }
  return res.json() as Promise<T>
}

export const api = {
  getTechnicians: () => request<Technician[]>('/technicians'),
  getUnassignedJobs: () => request<Job[]>('/jobs?unassigned=true'),
  getTechnicianJobs: (technicianId: string) =>
    request<Job[]>(`/jobs?technicianId=${encodeURIComponent(technicianId)}`),
  setAssignment: (jobId: string, technicianId: string | null) =>
    request<Job>(`/jobs/${encodeURIComponent(jobId)}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify({ technicianId }),
    }),
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}
