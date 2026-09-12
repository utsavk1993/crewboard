import { formatDate } from '@/lib/format'

describe('formatDate', () => {
  it('formats a date with a short month, day and year', () => {
    expect(formatDate('2026-09-15T00:00:00.000Z', 'en-US')).toBe('Sep 15, 2026')
  })

  it('stays on the same calendar day for a midnight-UTC date', () => {
    // West of UTC, local-time formatting would turn this into Dec 31, 2025.
    expect(formatDate('2026-01-01T00:00:00.000Z', 'en-US')).toBe('Jan 1, 2026')
  })

  it('uses the default locale when none is given', () => {
    const expected = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date('2026-01-01T00:00:00.000Z'))

    expect(formatDate('2026-01-01T00:00:00.000Z')).toBe(expected)
  })
})
