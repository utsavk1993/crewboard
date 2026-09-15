const dateFormatOptions: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  // Scheduled dates are stored as calendar dates (midnight UTC), so format in UTC to avoid off-by-one days.
  timeZone: 'UTC',
}

const monthYearFormatOptions: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric', timeZone: 'UTC' }

const dateFormatter = new Intl.DateTimeFormat(undefined, dateFormatOptions)
const monthYearFormatter = new Intl.DateTimeFormat(undefined, monthYearFormatOptions)

// The locale defaults to the user's; passing one gives stable output where that matters (e.g. tests).
export function formatDate(iso: string, locale?: string): string {
  const formatter =
    locale === undefined ? dateFormatter : new Intl.DateTimeFormat(locale, dateFormatOptions)
  return formatter.format(new Date(iso))
}

/** "March 2016" */
export function formatMonthYear(iso: string, locale?: string): string {
  const formatter =
    locale === undefined ? monthYearFormatter : new Intl.DateTimeFormat(locale, monthYearFormatOptions)
  return formatter.format(new Date(iso))
}

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'}`

/** How long someone has been on the crew, in whole years once past twelve months: "8 months", "6 years". */
export function formatTenure(hiredOn: string, now: Date = new Date()): string {
  const hired = new Date(hiredOn)
  // Whole calendar months, in UTC like the stored date; a month only counts once its day is reached.
  let months =
    (now.getUTCFullYear() - hired.getUTCFullYear()) * 12 + (now.getUTCMonth() - hired.getUTCMonth())
  if (now.getUTCDate() < hired.getUTCDate()) months -= 1

  if (months < 1) return 'less than a month'
  if (months < 12) return plural(months, 'month')
  return plural(Math.floor(months / 12), 'year')
}
