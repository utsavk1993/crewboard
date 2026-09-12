const dateFormatOptions: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  // Scheduled dates are stored as calendar dates (midnight UTC), so format in UTC to avoid off-by-one days.
  timeZone: 'UTC',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, dateFormatOptions)

// The locale defaults to the user's; passing one gives stable output where that matters (e.g. tests).
export function formatDate(iso: string, locale?: string): string {
  const formatter =
    locale === undefined ? dateFormatter : new Intl.DateTimeFormat(locale, dateFormatOptions)
  return formatter.format(new Date(iso))
}
