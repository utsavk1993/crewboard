import { render, screen } from '@testing-library/react'
import { AppHeader } from '@/components/layout/app-header'
import { ThemeProvider } from '@/components/theme/theme-provider'

describe('AppHeader', () => {
  it('renders the brand and the theme switcher in the banner landmark', () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>,
    )

    const banner = screen.getByRole('banner')
    expect(banner).toHaveTextContent('Crewboard')
    expect(banner).toHaveTextContent('Dispatch')
    expect(screen.getByRole('button', { name: 'Change theme' })).toBeInTheDocument()
  })
})
