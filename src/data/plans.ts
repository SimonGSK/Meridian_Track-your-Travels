import { partsOf, type VisitDate } from './visitDates'

/**
 * Trips to come: a visit planned for a day ("2026-11-12"), and flights
 * dated in a month or year still to come. Counted down to, and counted
 * once the day, or the month, comes.
 */

/** A day: "2026-11-12" */
export type Day = string

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export const isDay = (value: unknown): value is Day => typeof value === 'string' && DAY.test(value)

const pad = (n: number) => String(n).padStart(2, '0')

/** Today, here: "2026-10-09" */
export const dayOf = (date: Date): Day => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** The day after: for the first a plan can be */
export function nextDay(day: Day): Day {
  const [y, m, d] = day.split('-').map(Number)
  return dayOf(new Date(y, m - 1, d + 1))
}

/** Whole days from one day to another, by the calendar */
const daysBetween = (from: Day, to: Day) => {
  const utc = (day: Day) => {
    const [y, m, d] = day.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(to) - utc(from)) / 86_400_000)
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "12 Nov 2026" */
export function formatDay(day: Day) {
  const [y, m, d] = day.split('-').map(Number)
  return dayFormat.format(new Date(Date.UTC(y, m - 1, d)))
}

/** The month a planned visit is in, as a visit date once it's been */
export const monthOf = (day: Day): VisitDate => day.slice(0, 7)

/** A month or a year still to come: a flight that hasn't been flown yet */
export function isToCome(date: VisitDate, now = new Date()) {
  const { year, month } = partsOf(date)
  const thisYear = now.getFullYear()
  return month === null ? year > thisYear : year * 12 + month > thisYear * 12 + now.getMonth() + 1
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

/**
 * How long until a day ("in 23 days", "tomorrow", "today"), a month ("next
 * month", "in 3 months") or a year ("next year"); far off, in months or
 * years.
 */
export function countdown(date: Day | VisitDate, now = new Date()): string {
  if (isDay(date)) {
    const days = daysBetween(dayOf(now), date)
    if (days <= 0) return 'today'
    if (days === 1) return 'tomorrow'
    if (days <= 60) return `in ${days} days`
    return countdown(monthOf(date), now)
  }
  const { year, month } = partsOf(date)
  if (month === null) {
    const years = year - now.getFullYear()
    return years <= 0 ? 'this year' : years === 1 ? 'next year' : `in ${years} years`
  }
  const months = year * 12 + month - (now.getFullYear() * 12 + now.getMonth() + 1)
  if (months <= 0) return 'this month'
  if (months === 1) return 'next month'
  return months < 24 ? `in ${months} months` : `in ${plural(Math.round(months / 12), 'year')}`
}
