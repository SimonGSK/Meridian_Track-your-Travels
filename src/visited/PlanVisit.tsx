import { useState } from 'react'
import { countdown, dayOf, formatDay, isDay, nextDay, type Day } from '../data/plans'
import { CalendarIcon, CloseIcon, PencilIcon } from '../icons'

type Props = {
  /** The day you're going, if you've planned it */
  day: Day | null
  /** Plans the visit for a day, or with null, no longer */
  onChange: (day: Day | null) => void
}

/**
 * Planning a visit to a place, in its panel: the day you're going, counted
 * down to ("Going 12 Nov 2026 · in 23 days"), to change or give up.
 */
export default function PlanVisit({ day, onChange }: Props) {
  const [picking, setPicking] = useState(false)
  // From tomorrow: a visit today has been
  const [first] = useState(() => nextDay(dayOf(new Date())))

  if (picking) {
    return (
      <form
        className="plan-visit picking"
        onSubmit={(e) => {
          e.preventDefault()
          setPicking(false)
        }}
      >
        <CalendarIcon size={16} />
        <input
          type="date"
          aria-label="The day you're going"
          min={first}
          value={day ?? ''}
          onChange={(e) => {
            if (isDay(e.target.value) && e.target.value >= first) onChange(e.target.value)
          }}
          // Opened by pressing the button, to pick straight away
          autoFocus
        />
        <button type="submit" className="link-button">
          Done
        </button>
      </form>
    )
  }
  if (!day) {
    return (
      <button type="button" className="wish-button plan-button" onClick={() => setPicking(true)}>
        <CalendarIcon size={16} />
        Plan a visit
      </button>
    )
  }
  return (
    <div className="plan-visit">
      <CalendarIcon size={16} />
      <span className="plan-text">
        Going {formatDay(day)} · <strong className="countdown">{countdown(day)}</strong>
      </span>
      <button type="button" className="remove-button" onClick={() => setPicking(true)} aria-label="Change the day you're going">
        <PencilIcon size={14} />
      </button>
      <button type="button" className="remove-button" onClick={() => onChange(null)} aria-label="Not going after all">
        <CloseIcon size={14} />
      </button>
    </div>
  )
}
