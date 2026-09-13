import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppHeader } from '@/components/layout/app-header'
import { ThemeProvider } from '@/components/theme/theme-provider'

function renderHeader() {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('AppHeader', () => {
  it('renders the brand, the assistant button and the theme switcher in the banner landmark', () => {
    renderHeader()

    const banner = screen.getByRole('banner')
    expect(banner).toHaveTextContent('Crewboard')
    expect(banner).toHaveTextContent('Dispatch')
    expect(within(banner).getByRole('button', { name: 'Open assistant' })).toBeInTheDocument()
    expect(within(banner).getByRole('button', { name: 'Change theme' })).toBeInTheDocument()
  })

  it('links the brand to the dispatch board', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: 'Crewboard home' })).toHaveAttribute('href', '/')
  })
})
