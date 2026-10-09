import { cityOf } from '../data/airports'
import type { Route } from '../data/flights'

type Props = {
  /** What the trip's called, if it has a name */
  name: string | null
  /** The flight being flown */
  leg: Route
  index: number
  count: number
  onStop: () => void
}

/** At the bottom while following a trip: which flight of how many, and a way to stop */
export default function FollowBar({ name, leg, index, count, onStop }: Props) {
  return (
    <div className="follow-bar" role="status" aria-label="Following a trip">
      <span className="follow-text">
        {name && <strong>{name}</strong>}
        <span>
          {cityOf(leg.from)} → {cityOf(leg.to)}
        </span>
        <span className="follow-count">
          {index + 1} of {count}
        </span>
      </span>
      <button type="button" className="undo-button" onClick={onStop}>
        Stop
      </button>
    </div>
  )
}
