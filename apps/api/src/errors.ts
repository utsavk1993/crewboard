import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'

export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

/** Parses `input` with `schema`, turning validation failures into a 400 with a readable message. */
export function validate<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message ?? 'Invalid request.')
  }
  return result.data
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }

  // Errors raised by express.json() (malformed JSON, payload too large, ...) carry a 4xx status.
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'Request body must be valid JSON.' : String(err.message)
    res.status(err.status).json({ error: { code: 'BAD_REQUEST', message } })
    return
  }

  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } })
}
