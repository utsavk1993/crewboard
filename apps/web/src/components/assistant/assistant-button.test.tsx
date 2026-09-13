import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantButton } from '@/components/assistant/assistant-button'

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { sendAssistantMessage: jest.fn() },
}))

describe('AssistantButton', () => {
  it('opens the assistant panel when clicked', async () => {
    const user = userEvent.setup()
    render(<AssistantButton />)

    const button = screen.getByRole('button', { name: 'Open assistant' })
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Meta+J Control+J')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(button)

    expect(screen.getByRole('dialog', { name: 'Assistant' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message the assistant' })).toHaveFocus()
  })

  it('toggles the panel with Ctrl+J and Cmd+J', async () => {
    const user = userEvent.setup()
    render(<AssistantButton />)

    await user.keyboard('{Control>}j{/Control}')
    expect(screen.getByRole('dialog', { name: 'Assistant' })).toBeInTheDocument()

    // Focus is in the composer now; the shortcut still closes the panel from there.
    await user.keyboard('{Control>}j{/Control}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.keyboard('{Meta>}j{/Meta}')
    expect(screen.getByRole('dialog', { name: 'Assistant' })).toBeInTheDocument()
  })

  it('ignores the shortcut during IME composition and without a modifier', () => {
    render(<AssistantButton />)

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true, isComposing: true })
    fireEvent.keyDown(window, { key: 'j' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the conversation when the panel is closed and reopened', async () => {
    const user = userEvent.setup()
    render(<AssistantButton />)

    await user.click(screen.getByRole('button', { name: 'Open assistant' }))
    await user.type(screen.getByRole('textbox', { name: 'Message the assistant' }), 'Draft question')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Open assistant' }))

    expect(screen.getByRole('textbox', { name: 'Message the assistant' })).toHaveValue('Draft question')
  })
})
