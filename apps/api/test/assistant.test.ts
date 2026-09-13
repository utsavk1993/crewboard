import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

const chat = (body: unknown) => request(app).post('/api/assistant/chat').send(body as object)

const user = (content: string) => ({ role: 'user', content })
const assistant = (content: string) => ({ role: 'assistant', content })

const unavailable = { error: { code: 'ASSISTANT_UNAVAILABLE', message: "The assistant isn't connected yet." } }

describe('POST /api/assistant/chat', () => {
  it('reports that the assistant is not connected for a valid question', async () => {
    const res = await chat({ messages: [user("Who's free in Surrey tomorrow afternoon?")] })

    expect(res.status).toBe(503)
    expect(res.body).toEqual(unavailable)
  })

  it('accepts a multi-turn conversation that ends with the user', async () => {
    const res = await chat({
      messages: [user('Which urgent jobs are unassigned?'), assistant('Two are unassigned.'), user('Who could take them?')],
    })

    expect(res.status).toBe(503)
    expect(res.body).toEqual(unavailable)
  })

  it('accepts a full-size conversation larger than the default JSON body limit', async () => {
    // Alternating turns, ending with the user's 50th message.
    const messages = Array.from({ length: 50 }, (_, index) => ({
      role: index % 2 === 1 ? 'user' : 'assistant',
      content: 'x'.repeat(4000),
    }))

    const res = await chat({ messages })

    expect(res.status).toBe(503)
    expect(res.body).toEqual(unavailable)
  })

  it('rejects a request without a body', async () => {
    const res = await request(app).post('/api/assistant/chat')

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request body must be a JSON object like { "messages": [{ "role": "user", "content": "..." }] }.',
    })
  })

  it.each([
    ['missing messages', {}, 'messages must be an array of { role, content } objects.'],
    ['an empty conversation', { messages: [] }, 'Send at least one message.'],
    [
      'more than 50 messages',
      { messages: Array.from({ length: 51 }, () => user('Hi')) },
      'A conversation can include at most 50 messages.',
    ],
    ['a message that is not an object', { messages: ['Hi'] }, 'Each message must be an object with a role and content.'],
    ['an unknown role', { messages: [{ role: 'system', content: 'Hi' }] }, 'Message role must be "user" or "assistant".'],
    ['non-string content', { messages: [{ role: 'user', content: 42 }] }, 'Message content must be a string.'],
    ['empty content', { messages: [user('')] }, 'Message content cannot be empty.'],
    ['whitespace-only content', { messages: [user('  \n ')] }, 'Message content cannot be empty.'],
    ['content over 4,000 characters', { messages: [user('x'.repeat(4001))] }, 'Message content must be at most 4,000 characters.'],
    [
      'a conversation that ends with the assistant',
      { messages: [user('Hi'), assistant('Hello')] },
      'The last message must be from the user.',
    ],
  ])('rejects %s', async (_case, body, message) => {
    const res = await chat(body)

    expect(res.status).toBe(400)
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message })
  })

  it('returns a JSON 400 for a malformed JSON body', async () => {
    const res = await request(app).post('/api/assistant/chat').set('Content-Type', 'application/json').send('{"messages":')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON.' } })
  })
})
