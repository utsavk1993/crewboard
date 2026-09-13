import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantPanel } from '@/components/assistant/assistant-panel'
import { api, ApiError } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { sendAssistantMessage: jest.fn() },
}))

const sendAssistantMessage = jest.mocked(api.sendAssistantMessage)

const unavailable = () => new ApiError("The assistant isn't connected yet.", 503, 'ASSISTANT_UNAVAILABLE')

function renderPanel() {
  render(<AssistantPanel open onOpenChange={jest.fn()} />)
  return {
    log: screen.getByRole('log', { name: 'Conversation' }),
    composer: screen.getByRole('textbox', { name: 'Message the assistant' }),
  }
}

beforeEach(() => {
  sendAssistantMessage.mockReset()
})

describe('AssistantPanel', () => {
  it('opens with the composer focused and suggested questions', () => {
    const { composer } = renderPanel()

    expect(screen.getByRole('dialog', { name: 'Assistant' })).toHaveAccessibleDescription(
      'Ask about technicians, jobs and availability.',
    )
    expect(composer).toHaveFocus()
    expect(within(screen.getByRole('list', { name: 'Suggested questions' })).getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'New conversation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('sends a suggested question immediately and shows the reply', async () => {
    const user = userEvent.setup()
    sendAssistantMessage.mockResolvedValueOnce({ message: { role: 'assistant', content: 'Ada Lovelace is free from 1pm.' } })
    const { log } = renderPanel()

    await user.click(screen.getByRole('button', { name: "Who's free in Surrey tomorrow afternoon?" }))

    expect(sendAssistantMessage).toHaveBeenCalledWith([{ role: 'user', content: "Who's free in Surrey tomorrow afternoon?" }])
    expect(await within(log).findByText('Ada Lovelace is free from 1pm.')).toBeInTheDocument()
    expect(within(log).getByText("Who's free in Surrey tomorrow afternoon?")).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Suggested questions' })).not.toBeInTheDocument()
  })

  it('sends with Enter and adds a new line with Shift+Enter', async () => {
    const user = userEvent.setup()
    sendAssistantMessage.mockRejectedValue(unavailable())
    const { composer } = renderPanel()

    await user.type(composer, 'Line one{Shift>}{Enter}{/Shift}Line two')

    expect(sendAssistantMessage).not.toHaveBeenCalled()
    expect(composer).toHaveValue('Line one\nLine two')

    await user.keyboard('{Enter}')

    expect(sendAssistantMessage).toHaveBeenCalledWith([{ role: 'user', content: 'Line one\nLine two' }])
    expect(composer).toHaveValue('')
  })

  it('shows a thinking indicator and blocks sending while waiting for a reply', async () => {
    const user = userEvent.setup()
    sendAssistantMessage.mockReturnValue(new Promise(() => {}))
    const { composer, log } = renderPanel()

    await user.type(composer, 'Which urgent jobs are still unassigned?{Enter}')
    await user.type(composer, 'And tomorrow?{Enter}')

    expect(within(log).getByText('Assistant is thinking')).toBeInTheDocument()
    expect(sendAssistantMessage).toHaveBeenCalledTimes(1)
    expect(composer).toHaveValue('And tomorrow?')
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('shows the not-connected notice instead of an answer', async () => {
    const user = userEvent.setup()
    sendAssistantMessage.mockRejectedValueOnce(unavailable())
    const { composer, log } = renderPanel()

    await user.type(composer, 'Find an EV charger specialist near Langley')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    const notice = await within(log).findByRole('alert')
    expect(notice).toHaveTextContent('Assistant not connected')
    expect(notice).toHaveTextContent("The assistant isn't connected yet.")
    expect(within(log).queryByText('Assistant is thinking')).not.toBeInTheDocument()
  })

  it('shows an error notice when the request fails', async () => {
    const user = userEvent.setup()
    sendAssistantMessage.mockRejectedValueOnce(new ApiError('Something went wrong. Please try again.', 500, 'INTERNAL_ERROR'))
    const { composer, log } = renderPanel()

    await user.type(composer, 'Hello{Enter}')

    const notice = await within(log).findByRole('alert')
    expect(notice).toHaveTextContent("Couldn't get an answer")
    expect(notice).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('clears the conversation with New conversation', async () => {
    const user = userEvent.setup()
    sendAssistantMessage.mockRejectedValueOnce(unavailable())
    const { composer, log } = renderPanel()

    await user.type(composer, 'Hello{Enter}')
    await within(log).findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'New conversation' }))

    expect(within(log).queryByText('Hello')).not.toBeInTheDocument()
    expect(within(log).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Suggested questions' })).toBeInTheDocument()
    expect(composer).toHaveFocus()
  })
})
