import { api, ApiError, errorMessage } from '@/lib/api'
import type { Technician } from '@/lib/types'
import { makeLocation, makeSpecialty } from '@/test/factories'

const technician: Technician = {
  id: 't1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  designation: 'Senior Technician',
  region: 'North',
  skills: ['Electrical'],
  specialties: [makeSpecialty('Electrical', 'Trades')],
  location: makeLocation('North'),
  assignedJobCount: 2,
  hiredOn: '2019-03-14T00:00:00.000Z',
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }
}

function textResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
  }
}

const fetchMock = jest.fn()
const originalFetch = global.fetch

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterAll(() => {
  global.fetch = originalFetch
})

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('Expected the request to fail')
    },
    (err: unknown) => err,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('api', () => {
  it('returns the parsed JSON body on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [technician]))

    await expect(api.getTechnicians()).resolves.toEqual([technician])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/technicians')
    expect(init.headers).toEqual({ Accept: 'application/json' })
  })

  it('requests unassigned jobs, a technician and their jobs with URL-encoded ids', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await api.getUnassignedJobs()
    await api.getTechnicianJobs('a b/c')
    await api.getTechnician('a b/c')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/jobs?unassigned=true')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/jobs?technicianId=a%20b%2Fc')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/technicians/a%20b%2Fc')
  })

  it('throws an ApiError with the message, code and status from the error body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'JOB_ALREADY_ASSIGNED', message: 'Job is already assigned' } }),
    )

    const error = await rejection(api.setAssignment('j1', 't1'))

    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('Job is already assigned')
    expect(error.code).toBe('JOB_ALREADY_ASSIGNED')
    expect(error.status).toBe(409)
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(textResponse(502))

    const error = await rejection(api.getTechnicians())

    expect(error.message).toBe('Request failed (502)')
    expect(error.code).toBeUndefined()
    expect(error.status).toBe(502)
  })

  it('sends a PATCH with a JSON body to the URL-encoded assignment path', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await api.setAssignment('job/1', null)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/jobs/job%2F1/assignment')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ technicianId: null })
    expect(init.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json' })
  })
})

describe('errorMessage', () => {
  it('returns the message of an Error', () => {
    expect(errorMessage(new ApiError('Not found', 404))).toBe('Not found')
  })

  it('falls back to a generic message for anything else', () => {
    expect(errorMessage('boom')).toBe('Something went wrong')
  })
})
