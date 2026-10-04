import { useCallback } from 'react'
import { isVisitDate, newestFirst, type VisitDate } from '../data/visitDates'
import { usePersistentState } from '../storage'

export const VISIT_DATES_KEY = 'countries-app.visit-dates'

type VisitDates = Record<string, VisitDate[]>

export const isVisitDates = (value: unknown): value is VisitDates =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((dates) => Array.isArray(dates) && dates.every(isVisitDate))

const NONE: readonly VisitDate[] = []

/** When you went to each country, by name: several visits, each a month or a year, saved in this browser. */
export function useVisitDates() {
  const [saved, setSaved] = usePersistentState<VisitDates>(VISIT_DATES_KEY, {}, isVisitDates)

  /** Newest first */
  const datesOf = useCallback(
    (name: string): readonly VisitDate[] => (saved[name] ? [...saved[name]].sort(newestFirst) : NONE),
    [saved],
  )
  const addVisit = useCallback(
    (name: string, date: VisitDate) =>
      setSaved((prev) => (prev[name]?.includes(date) ? prev : { ...prev, [name]: [...(prev[name] ?? []), date] })),
    [setSaved],
  )
  const removeVisit = useCallback(
    (name: string, date: VisitDate) =>
      setSaved((prev) => {
        const { [name]: dates = [], ...rest } = prev
        const left = dates.filter((d) => d !== date)
        return left.length ? { ...rest, [name]: left } : rest
      }),
    [setSaved],
  )
  return { datesOf, addVisit, removeVisit }
}
