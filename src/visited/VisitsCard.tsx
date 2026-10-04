import { useState } from 'react'
import { formatVisitDate, type VisitDate } from '../data/visitDates'
import { CloseIcon } from '../icons'
import Card from '../ui/Card'
import MonthYearSelect from './MonthYearSelect'

type Props = {
  /** Newest first */
  dates: readonly VisitDate[]
  onAdd: (date: VisitDate) => void
  onRemove: (date: VisitDate) => void
}

/** When you went to a country: each visit, a month and year or just the year, and a way to add another */
export default function VisitsCard({ dates, onAdd, onRemove }: Props) {
  const [date, setDate] = useState<VisitDate>(() => String(new Date().getFullYear()))
  return (
    <Card label="Visits" meta={String(dates.length).padStart(2, '0')} className="visits-card">
      {dates.length > 0 ? (
        <ul className="city-list" aria-label="Visits">
          {dates.map((d) => (
            <li key={d}>
              <span className="dot" aria-hidden="true" />
              <span className="city-name">{formatVisitDate(d)}</span>
              <button
                type="button"
                className="remove-button"
                onClick={() => onRemove(d)}
                aria-label={`Remove the visit in ${formatVisitDate(d)}`}
              >
                <CloseIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">When did you go? Add each visit: the month and year, or just the year.</p>
      )}
      <div className="date-adder">
        <MonthYearSelect label="When you went" value={date} onChange={(d) => d && setDate(d)} />
        <button type="button" className="primary-button secondary" onClick={() => onAdd(date)} disabled={dates.includes(date)}>
          Add visit
        </button>
      </div>
    </Card>
  )
}
