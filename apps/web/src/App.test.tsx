import { render, screen } from '@testing-library/react'
import { App } from '@/App'
import { ThemeProvider } from '@/components/theme/theme-provider'

describe('App', () => {
  it('renders the header and the dispatch board heading', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )

    expect(screen.getByRole('banner')).toHaveTextContent('Crewboard')
    expect(screen.getByRole('heading', { name: 'Dispatch board', level: 1 })).toBeInTheDocument()
  })
})
