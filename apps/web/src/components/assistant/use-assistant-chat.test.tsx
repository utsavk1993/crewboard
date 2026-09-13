import { act, renderHook } from '@testing-library/react'
import { useAssistantChat } from '@/components/assistant/use-assistant-chat'
import { api, ApiError } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { sendAssistantMessage: jest.fn() },
}))

const sendAssistantMessage = jest.mocked(api.sendAssistantMessage)

const reply = (content: string) => ({ message: { role: 'assistant' as const, content } })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const withoutIds = (messages: { role: string; content: string }[]) => messages.map(({ role, content }) => ({ role, content }))

beforeEach(() => {
  sendAssistantMessage.mockReset()
})

describe('useAssistantChat', () => {
  it('sends the whole conversation and appends each reply', async () => {
    sendAssistantMessage.mockResolvedValueOnce(reply('Ada is free after 1pm.')).mockResolvedValueOnce(reply('Done.'))
    const { result } = renderHook(() => useAssistantChat())

    await act(() => result.current.send("  Who's free in Surrey?  "))

    expect(sendAssistantMessage).toHaveBeenCalledWith([{ role: 'user', content: "Who's free in Surrey?" }])
    expect(withoutIds(result.current.messages)).toEqual([
      { role: 'user', content: "Who's free in Surrey?" },
      { role: 'assistant', content: 'Ada is free after 1pm.' },
    ])
    expect(result.current.pending).toBe(false)
    expect(result.current.notice).toBeNull()

    await act(() => result.current.send('Anyone else?'))

    expect(sendAssistantMessage).toHaveBeenLastCalledWith([
      { role: 'user', content: "Who's free in Surrey?" },
      { role: 'assistant', content: 'Ada is free after 1pm.' },
      { role: 'user', content: 'Anyone else?' },
    ])
    expect(result.current.messages).toHaveLength(4)
    expect(new Set(result.current.messages.map((message) => message.id)).size).toBe(4)
  })

  it('reports an unconnected assistant as a notice, not an answer', async () => {
    sendAssistantMessage.mockRejectedValueOnce(new ApiError("The assistant isn't connected yet.", 503, 'ASSISTANT_UNAVAILABLE'))
    const { result } = renderHook(() => useAssistantChat())

    await act(() => result.current.send('Which urgent jobs are unassigned?'))

    expect(withoutIds(result.current.messages)).toEqual([{ role: 'user', content: 'Which urgent jobs are unassigned?' }])
    expect(result.current.notice).toEqual({ kind: 'unavailable', message: "The assistant isn't connected yet." })
    expect(result.current.pending).toBe(false)
  })

  it('reports other failures as an error notice', async () => {
    sendAssistantMessage.mockRejectedValueOnce(new ApiError('Something went wrong. Please try again.', 500, 'INTERNAL_ERROR'))
    const { result } = renderHook(() => useAssistantChat())

    await act(() => result.current.send('Hello'))

    expect(result.current.notice).toEqual({ kind: 'error', message: 'Something went wrong. Please try again.' })

    sendAssistantMessage.mockResolvedValueOnce(reply('Hi.'))
    await act(() => result.current.send('Hello again'))

    // A new question clears the previous notice.
    expect(result.current.notice).toBeNull()
  })

  it('ignores blank text and sends made while a reply is pending', async () => {
    const response = deferred<ReturnType<typeof reply>>()
    sendAssistantMessage.mockReturnValueOnce(response.promise)
    const { result } = renderHook(() => useAssistantChat())

    await act(() => result.current.send('   '))
    expect(sendAssistantMessage).not.toHaveBeenCalled()
    expect(result.current.messages).toEqual([])

    act(() => {
      void result.current.send('First')
    })
    expect(result.current.pending).toBe(true)

    await act(() => result.current.send('Second'))
    expect(sendAssistantMessage).toHaveBeenCalledTimes(1)

    await act(async () => response.resolve(reply('Answer')))
    expect(withoutIds(result.current.messages)).toEqual([
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Answer' },
    ])
    expect(result.current.pending).toBe(false)
  })

  it('resets the conversation and drops a reply that arrives afterwards', async () => {
    const response = deferred<ReturnType<typeof reply>>()
    sendAssistantMessage.mockReturnValueOnce(response.promise)
    const { result } = renderHook(() => useAssistantChat())

    act(() => {
      void result.current.send('First')
    })
    act(() => result.current.reset())

    expect(result.current.messages).toEqual([])
    expect(result.current.pending).toBe(false)
    expect(result.current.notice).toBeNull()

    await act(async () => response.resolve(reply('Late answer')))
    expect(result.current.messages).toEqual([])
  })
})
