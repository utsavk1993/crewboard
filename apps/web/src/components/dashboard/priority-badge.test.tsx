import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '@/components/dashboard/priority-badge'

describe('PriorityBadge', () => {
  it.each([
    ['URGENT', 'Urgent', 'destructive'],
    ['HIGH', 'High', 'warning'],
    ['MEDIUM', 'Medium', 'info'],
    ['LOW', 'Low', 'outline'],
  ] as const)('renders %s as a %s badge', (priority, label, variant) => {
    render(<PriorityBadge priority={priority} />)

    expect(screen.getByText(label)).toHaveAttribute('data-variant', variant)
  })

  it('marks only urgent jobs with a leading dot', () => {
    const { rerender } = render(<PriorityBadge priority="URGENT" />)
    expect(screen.getByText('Urgent').querySelector('[aria-hidden="true"]')).toBeInTheDocument()

    rerender(<PriorityBadge priority="HIGH" />)
    expect(screen.getByText('High').querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('accepts extra classes', () => {
    render(<PriorityBadge priority="LOW" className="ml-2" />)

    expect(screen.getByText('Low')).toHaveClass('ml-2', 'text-muted-foreground')
  })
})
