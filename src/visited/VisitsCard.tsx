import { useState } from 'react'
import { formatVisitDate, type VisitDate } from '../data/visitDates'
import { CloseIcon, PencilIcon } from '../icons'
import Card from '../ui/Card'
import MonthYearSelect from './MonthYearSelect'
import { NOTE_MAX_LENGTH } from './useVisitDates'

type Props = {
  /** Newest first */
  dates: readonly VisitDate[]
  onAdd: (date: VisitDate) => void
  onRemove: (date: VisitDate) => void
  /** The note on a visit, if it has one */
  noteOf: (date: VisitDate) => string | undefined
  /** Writes a visit's note; an empty one removes it */
  onNote: (date: VisitDate, note: string) => void
}

/** When you went to a country: each visit, a month and year or just the year, with a note, and a way to add another */
export default function VisitsCard({ dates, onAdd, onRemove, noteOf, onNote }: Props) {
  const [date, setDate] = useState<VisitDate>(() => String(new Date().getFullYear()))
  /** The visit whose note is being written */
  const [writing, setWriting] = useState<VisitDate | null>(null)
  return (
    <Card label="Visits" meta={String(dates.length).padStart(2, '0')} className="visits-card">
      {dates.length > 0 ? (
        <ul className="city-list visit-list" aria-label="Visits">
          {dates.map((d) => {
            const when = formatVisitDate(d)
            const note = noteOf(d)
            return (
              <li key={d} className={writing === d ? 'writing' : undefined}>
                <span className="dot" aria-hidden="true" />
                <span className="visit-text">
                  <span className="city-name">{when}</span>
                  {note && writing !== d && <span className="visit-note">{note}</span>}
                </span>
                <button
                  type="button"
                  className="remove-button note-button"
                  aria-expanded={writing === d}
                  onClick={() => setWriting(writing === d ? null : d)}
                  aria-label={note ? `Change the note on the visit in ${when}` : `Add a note to the visit in ${when}`}
                >
                  <PencilIcon size={14} />
                </button>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => onRemove(d)}
                  aria-label={`Remove the visit in ${when}`}
                >
                  <CloseIcon size={14} />
                </button>
                {writing === d && (
                  <form
                    className="note-editor"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setWriting(null)
                    }}
                  >
                    <input
                      type="text"
                      aria-label={`Note on the visit in ${when}`}
                      placeholder="Who with, what you did…"
                      maxLength={NOTE_MAX_LENGTH}
                      value={note ?? ''}
                      onChange={(e) => onNote(d, e.target.value)}
                      // Opened by pressing the note button, to write in straight away
                      autoFocus
                    />
                    <button type="submit" className="link-button">
                      Done
                    </button>
                  </form>
                )}
              </li>
            )
          })}
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
