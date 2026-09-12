import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it.each([
    ['default', 'bg-primary'],
    ['secondary', 'bg-secondary'],
    ['outline', 'border-input'],
    ['ghost', 'hover:bg-accent'],
    ['destructive', 'bg-destructive'],
    ['link', 'underline-offset-4'],
  ] as const)('renders the %s variant', (variant, expectedClass) => {
    render(<Button variant={variant}>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('data-variant', variant)
    expect(button).toHaveClass(expectedClass)
  })

  it.each([
    ['sm', 'h-8'],
    ['default', 'h-9'],
    ['lg', 'h-10'],
    ['icon', 'size-9'],
    ['icon-sm', 'size-8'],
  ] as const)('renders the %s size', (size, expectedClass) => {
    render(
      <Button size={size} aria-label="Refresh">
        R
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Refresh' })
    expect(button).toHaveAttribute('data-size', size)
    expect(button).toHaveClass(expectedClass)
  })

  it('lets callers override classes', () => {
    render(<Button className="h-12">Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveClass('h-12')
    expect(button).not.toHaveClass('h-9')
  })

  it('renders its child with button styling when asChild is set', () => {
    render(
      <Button asChild variant="outline">
        <a href="/jobs">Jobs</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Jobs' })
    expect(link).toHaveAttribute('href', '/jobs')
    expect(link).toHaveAttribute('data-slot', 'button')
    expect(link).toHaveClass('border-input')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
