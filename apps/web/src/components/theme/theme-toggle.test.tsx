import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const root = document.documentElement

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  afterEach(() => {
    root.className = ''
    root.removeAttribute('style')
    window.localStorage.clear()
  })

  it('offers light, dark and system with the current choice checked', async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole('button', { name: 'Change theme' }))

    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('menuitemradio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
  })

  it('applies and persists the dark theme when Dark is chosen', async () => {
    const user = userEvent.setup()
    renderToggle()
    expect(root).not.toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'Change theme' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(root).toHaveClass('dark')
    expect(window.localStorage.getItem('crewboard-theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Change theme' }))
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  })
})
