import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/components/theme/theme-provider'

const STORAGE_KEY = 'crewboard-theme'
const originalMatchMedia = window.matchMedia

// Replaces the jsdom stub with a prefers-color-scheme query whose OS preference the test controls.
function mockSystemTheme(initial: 'light' | 'dark') {
  let prefersDark = initial === 'dark'
  const listeners = new Set<() => void>()

  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return query === '(prefers-color-scheme: dark)' && prefersDark
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList

  return {
    change(next: 'light' | 'dark') {
      prefersDark = next === 'dark'
      act(() => listeners.forEach((listener) => listener()))
    },
  }
}

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <p>{`theme: ${theme}`}</p>
      <p>{`resolved: ${resolvedTheme}`}</p>
      <button type="button" onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        System
      </button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )
}

const root = document.documentElement

describe('ThemeProvider', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia
    root.className = ''
    root.removeAttribute('style')
    window.localStorage.clear()
    jest.restoreAllMocks()
  })

  it('defaults to the system theme and follows the OS preference', () => {
    mockSystemTheme('dark')

    renderWithProvider()

    expect(screen.getByText('theme: system')).toBeInTheDocument()
    expect(screen.getByText('resolved: dark')).toBeInTheDocument()
    expect(root).toHaveClass('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it('uses the light theme when the OS prefers light', () => {
    mockSystemTheme('light')

    renderWithProvider()

    expect(screen.getByText('resolved: light')).toBeInTheDocument()
    expect(root).not.toHaveClass('dark')
    expect(root.style.colorScheme).toBe('light')
  })

  it('applies and persists an explicit choice across remounts', async () => {
    const user = userEvent.setup()
    mockSystemTheme('light')
    const { unmount } = renderWithProvider()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(root).toHaveClass('dark')
    expect(root.style.colorScheme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')

    unmount()
    renderWithProvider()

    expect(screen.getByText('theme: dark')).toBeInTheDocument()
    expect(root).toHaveClass('dark')
  })

  it('flips the theme when the OS preference changes while on system', () => {
    const system = mockSystemTheme('light')
    renderWithProvider()

    system.change('dark')
    expect(screen.getByText('resolved: dark')).toBeInTheDocument()
    expect(root).toHaveClass('dark')

    system.change('light')
    expect(screen.getByText('resolved: light')).toBeInTheDocument()
    expect(root).not.toHaveClass('dark')
  })

  it('ignores OS changes while an explicit theme is selected', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, 'dark')
    const system = mockSystemTheme('dark')
    renderWithProvider()

    system.change('light')

    expect(screen.getByText('resolved: dark')).toBeInTheDocument()
    expect(root).toHaveClass('dark')

    // Returning to system picks up the preference that changed in the meantime.
    await user.click(screen.getByRole('button', { name: 'System' }))

    expect(screen.getByText('resolved: light')).toBeInTheDocument()
    expect(root).not.toHaveClass('dark')
  })

  it('falls back to the default theme when storage is unreadable or holds an unknown value', () => {
    mockSystemTheme('dark')
    window.localStorage.setItem(STORAGE_KEY, 'sepia')
    const { unmount } = renderWithProvider()

    expect(screen.getByText('theme: system')).toBeInTheDocument()

    unmount()
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    renderWithProvider()

    expect(screen.getByText('theme: system')).toBeInTheDocument()
    expect(root).toHaveClass('dark')
  })

  it('throws a clear error when used outside the provider', () => {
    // React logs the render error before rethrowing it.
    jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<ThemeProbe />)).toThrow('useTheme must be used within a ThemeProvider')
  })
})
