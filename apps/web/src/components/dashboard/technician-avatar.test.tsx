import { render } from '@testing-library/react'
import { TechnicianAvatar } from '@/components/dashboard/technician-avatar'

function renderAvatar(name: string, size?: 'sm' | 'md' | 'lg') {
  const { container } = render(<TechnicianAvatar name={name} size={size} />)
  return container.querySelector('[data-slot="technician-avatar"]') as HTMLElement
}

describe('TechnicianAvatar', () => {
  it.each([
    ['Ana Lima', 'AL'],
    ['maria de la cruz', 'MC'],
    ['  Jordan   Lee ', 'JL'],
    ['Prince', 'P'],
  ])('shows the initials of "%s" as %s', (name, initials) => {
    expect(renderAvatar(name)).toHaveTextContent(initials)
  })

  it('is hidden from assistive tech because the name is shown beside it', () => {
    expect(renderAvatar('Ana Lima')).toHaveAttribute('aria-hidden', 'true')
  })

  it('gives the same name the same tint every time', () => {
    const first = renderAvatar('Ana Lima')
    const second = renderAvatar('Ana Lima')

    expect(first.dataset.tint).toBe(second.dataset.tint)
    expect(first.className).toBe(second.className)
    expect(first).toHaveClass(`bg-avatar-${first.dataset.tint}`, `text-avatar-${first.dataset.tint}-foreground`)
  })

  it('spreads different names across the tints', () => {
    const names = ['Ana Lima', 'Ben Carter', 'Chloe Nguyen', 'Diego Alvarez', 'Emma Brooks', 'Farah Khan', 'Gus Olsen']
    const tints = new Set(names.map((name) => renderAvatar(name).dataset.tint))

    expect(tints.size).toBeGreaterThan(1)
    tints.forEach((tint) => expect(Number(tint)).toBeGreaterThanOrEqual(1))
    tints.forEach((tint) => expect(Number(tint)).toBeLessThanOrEqual(6))
  })

  it.each([
    ['sm', 'size-6'],
    ['md', 'size-8'],
    ['lg', 'size-10'],
  ] as const)('renders the %s size', (size, expectedClass) => {
    expect(renderAvatar('Ana Lima', size)).toHaveClass(expectedClass)
  })
})
