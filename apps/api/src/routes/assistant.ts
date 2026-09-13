import express, { Router } from 'express'
import { z } from 'zod'
import { HttpError, validate } from '../errors'

export const MAX_ASSISTANT_MESSAGES = 50
export const MAX_ASSISTANT_MESSAGE_LENGTH = 4000

export const assistantMessageSchema = z.object(
  {
    role: z.enum(['user', 'assistant'], { error: 'Message role must be "user" or "assistant".' }),
    content: z
      .string({ error: 'Message content must be a string.' })
      .trim()
      .min(1, { error: 'Message content cannot be empty.' })
      .max(MAX_ASSISTANT_MESSAGE_LENGTH, { error: 'Message content must be at most 4,000 characters.' }),
  },
  { error: 'Each message must be an object with a role and content.' },
)

export const assistantChatBodySchema = z
  .object(
    {
      messages: z
        .array(assistantMessageSchema, { error: 'messages must be an array of { role, content } objects.' })
        .min(1, { error: 'Send at least one message.' })
        .max(MAX_ASSISTANT_MESSAGES, { error: 'A conversation can include at most 50 messages.' }),
    },
    { error: 'Request body must be a JSON object like { "messages": [{ "role": "user", "content": "..." }] }.' },
  )
  .refine((body) => body.messages.at(-1)?.role === 'user', {
    error: 'The last message must be from the user.',
    path: ['messages'],
  })

export type AssistantMessage = z.infer<typeof assistantMessageSchema>
export type AssistantChatBody = z.infer<typeof assistantChatBodySchema>

export const assistantRouter = Router()

// A full conversation (50 messages of 4,000 characters) is larger than express.json()'s default 100kb limit,
// so this router parses its own bodies and is mounted ahead of the app-wide parser.
assistantRouter.use(express.json({ limit: '1mb' }))

assistantRouter.post('/chat', (req) => {
  validate(assistantChatBodySchema, req.body)
  throw new HttpError(503, 'ASSISTANT_UNAVAILABLE', "The assistant isn't connected yet.")
})
