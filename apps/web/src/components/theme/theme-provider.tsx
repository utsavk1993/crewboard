import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

// The inline script in index.html repeats this query and the storage key to pick the theme before first paint.
const DARK_QUERY = '(prefers-color-scheme: dark)'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

// Storage access throws when it's blocked (some privacy modes, sandboxed iframes); the theme still has to work.
function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return isTheme(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

function writeStoredTheme(storageKey: string, theme: Theme) {
  try {
    window.localStorage.setItem(storageKey, theme)
  } catch {
    // Not persisting is acceptable: the choice still applies for this session.
  }
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'crewboard-theme' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme))
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia(DARK_QUERY)
    const sync = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    // The OS preference may have changed while an explicit theme was selected.
    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [theme])

  // Layout effect so the class flips in the same frame as the state change, never a painted frame late.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback(
    (next: Theme) => {
      writeStoredTheme(storageKey, next)
      setThemeState(next)
    },
    [storageKey],
  )

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
