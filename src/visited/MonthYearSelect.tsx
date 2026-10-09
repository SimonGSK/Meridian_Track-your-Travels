import { useState } from 'react'
import { FIRST_YEAR, MONTHS, partsOf, visitDate, type VisitDate } from '../data/visitDates'

type Props = {
  /** What the date is for, read out for the two choices together */
  label: string
  value: VisitDate | null
  onChange: (date: VisitDate | null) => void
  /** The year can be left out too, for no date */
  optional?: boolean
  /** The months and years to come too, up to FUTURE_YEARS ahead: a flight booked */
  future?: boolean
}

/** How far ahead a date to come can be */
export const FUTURE_YEARS = 5

/**
 * A month (or none) and a year, up to this month, or some years ahead with
 * `future`. Holds its own choice: give it a new `key` to start over.
 */
export default function MonthYearSelect({ label, value, onChange, optional = false, future = false }: Props) {
  // Read once: what's to come doesn't change while it's open
  const [now] = useState(() => new Date())
  const thisYear = now.getFullYear()
  const lastYear = future ? thisYear + FUTURE_YEARS : thisYear
  // The last month there is to pick this year
  const lastMonth = future ? 12 : now.getMonth() + 1
  const [month, setMonth] = useState(() => (value && partsOf(value).month) || null)
  const [year, setYear] = useState(() => (value ? partsOf(value).year : null))

  const change = (nextYear: number | null, nextMonth: number | null) => {
    // A month still to come this year can't be picked; moving to this year forgets one
    const month = nextYear === thisYear && nextMonth && nextMonth > lastMonth ? null : nextMonth
    setYear(nextYear)
    setMonth(month)
    onChange(nextYear ? visitDate(nextYear, month) : null)
  }

  return (
    <span className="month-year" role="group" aria-label={label}>
      <select aria-label="Month" value={month ?? ''} onChange={(e) => change(year, Number(e.target.value) || null)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1} disabled={year === thisYear && i + 1 > lastMonth}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label="Year" value={year ?? ''} onChange={(e) => change(Number(e.target.value) || null, month)}>
        {(optional || year === null) && <option value="">Year</option>}
        {Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => lastYear - i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </span>
  )
}
