import { render, screen } from '@testing-library/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

describe('Alert', () => {
  it('announces its title and description', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Couldn't load technicians</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
      </Alert>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load technicians")
    expect(alert).toHaveTextContent('Check your connection and try again.')
  })
})

describe('Spinner', () => {
  it('is exposed as a labelled status', () => {
    render(<Spinner aria-label="Loading technicians" />)

    expect(screen.getByRole('status', { name: 'Loading technicians' })).toBeInTheDocument()
  })
})
