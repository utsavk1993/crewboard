import { render, screen } from '@testing-library/react'
import { App } from '@/App'

describe('App', () => {
  it('renders the Crewboard heading', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Crewboard', level: 1 })).toBeInTheDocument()
  })
})
