import { render, screen } from '@testing-library/react'
import { LocationLabel } from '@/components/dashboard/location-label'
import { makeLocation } from '@/test/factories'

const surrey = makeLocation('Surrey')

function renderLabel(props: Partial<Parameters<typeof LocationLabel>[0]> = {}) {
  const { container } = render(<LocationLabel location={surrey} {...props} />)
  return container.querySelector('[data-slot="location-label"]') as HTMLElement
}

describe('LocationLabel', () => {
  it('shows the city followed by its region by default', () => {
    const label = renderLabel()

    expect(label).toHaveTextContent(/^Surrey·Metro Vancouver$/)
    expect(screen.getByText('Metro Vancouver')).toHaveClass('text-muted-foreground')
    expect(screen.getByText('·')).toHaveAttribute('aria-hidden', 'true')
  })

  it('hides the map pin from assistive tech', () => {
    const label = renderLabel()

    const icons = label.querySelectorAll('svg')
    expect(icons).toHaveLength(1)
    expect(icons[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows province, region and city in full', () => {
    const label = renderLabel({ detail: 'full' })

    expect(label).toHaveTextContent(/^British ColumbiaMetro VancouverSurrey$/)
    label.querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
    // The map pin plus a chevron between each of the three places.
    expect(label.querySelectorAll('svg')).toHaveLength(3)
  })

  it('names the full location in reading order', () => {
    renderLabel({ detail: 'full' })

    expect(screen.getByRole('img', { name: 'Surrey, Metro Vancouver, BC' })).toBeInTheDocument()
    expect(screen.getByLabelText('Surrey, Metro Vancouver, BC')).toBeInTheDocument()
  })

  it('accepts a class name', () => {
    expect(renderLabel({ className: 'text-xs' })).toHaveClass('text-xs', 'inline-flex')
    expect(renderLabel({ detail: 'full', className: 'text-xs' })).toHaveClass('text-xs')
  })
})
