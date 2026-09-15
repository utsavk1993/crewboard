import { formatDate, formatMonthYear, formatTenure } from '@/lib/format'

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

describe('formatMonthYear', () => {
  it('formats the month and year of a midnight-UTC date without shifting to the previous month', () => {
    expect(formatMonthYear('2016-03-01T00:00:00.000Z', 'en-US')).toBe('March 2016')
  })
})

describe('formatTenure', () => {
  const hiredOn = '2020-03-14T00:00:00.000Z'
  const at = (iso: string) => new Date(iso)

  it('counts whole years once past twelve months', () => {
    expect(formatTenure(hiredOn, at('2026-09-14T12:00:00.000Z'))).toBe('6 years')
    expect(formatTenure(hiredOn, at('2021-03-14T00:00:00.000Z'))).toBe('1 year')
    expect(formatTenure(hiredOn, at('2022-03-13T00:00:00.000Z'))).toBe('1 year')
  })

  it('counts months in the first year', () => {
    expect(formatTenure(hiredOn, at('2020-11-20T00:00:00.000Z'))).toBe('8 months')
    expect(formatTenure(hiredOn, at('2020-04-14T00:00:00.000Z'))).toBe('1 month')
    expect(formatTenure(hiredOn, at('2021-03-13T00:00:00.000Z'))).toBe('11 months')
  })

  it('only counts a month once its day is reached', () => {
    expect(formatTenure(hiredOn, at('2020-04-13T23:59:59.000Z'))).toBe('less than a month')
  })

  it('reads as less than a month for a brand-new or future hire', () => {
    expect(formatTenure(hiredOn, at('2020-03-14T00:00:00.000Z'))).toBe('less than a month')
    expect(formatTenure(hiredOn, at('2019-12-01T00:00:00.000Z'))).toBe('less than a month')
  })
})
