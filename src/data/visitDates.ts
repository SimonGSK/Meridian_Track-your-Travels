/** When you went, or flew: a month of a year ("2023-05"), or just the year ("2023") */
export type VisitDate = string

/** The first year to pick from */
export const FIRST_YEAR = 1950

const PATTERN = /^\d{4}(-(0[1-9]|1[0-2]))?$/

export const isVisitDate = (value: unknown): value is VisitDate => typeof value === 'string' && PATTERN.test(value)

/** The date for a year and a month (1–12), or the year alone */
export const visitDate = (year: number, month: number | null): VisitDate =>
  month ? `${year}-${String(month).padStart(2, '0')}` : String(year)

/** The year and month (null for none) of a date */
export function partsOf(date: VisitDate): { year: number; month: number | null } {
  const [year, month] = date.split('-').map(Number)
  return { year, month: month || null }
}

/** For sorting, newest first; a year alone comes after its months */
export const newestFirst = (a: VisitDate, b: VisitDate) => (a < b ? 1 : a > b ? -1 : 0)

/** This month at the latest: you can't have been yet */
export const isPast = (date: VisitDate, now = new Date()) =>
  date <= visitDate(now.getFullYear(), now.getMonth() + 1)

const monthAndYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "May 2023", or "2023" */
export function formatVisitDate(date: VisitDate) {
  const { year, month } = partsOf(date)
  return month ? monthAndYear.format(new Date(Date.UTC(year, month - 1, 1))) : String(year)
}

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' })

/** January to December */
export const MONTHS = Array.from({ length: 12 }, (_, i) => monthName.format(new Date(Date.UTC(2000, i, 1))))

/** "May 2023", or "3 visits, last May 2023" */
export function describeVisits(dates: readonly VisitDate[]) {
  if (dates.length === 0) return null
  const last = formatVisitDate([...dates].sort(newestFirst)[0])
  return dates.length === 1 ? last : `${dates.length} visits, last ${last}`
}
