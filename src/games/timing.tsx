import { useEffect, useState } from 'react'
import { formatDuration } from './allGame'
import { formatRunTime, isPerfect, runTime } from './records'
import type { GameState } from './useGame'

/** The clock and the time records, shared by the games' panels */

/** Counts up from `since`, or shows the time taken once `until` is set. */
export function Elapsed({ since, until }: { since: number; until: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until !== null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [until])
  return <span className="elapsed">{formatDuration((until ?? now) - since)}</span>
}

/** " · record 0:42.3", after a best score */
export function RecordTime({ time }: { time: number | undefined }) {
  if (time === undefined) return null
  return <span className="record-time"> · record {formatRunTime(time)}</span>
}

/** A perfect run's time, and whether it's a record; otherwise why the time doesn't count */
export function RunTime({ game, previousTime }: { game: GameState; previousTime: number | undefined }) {
  const time = formatRunTime(runTime(game))
  if (!isPerfect(game)) {
    return (
      <p className="muted run-time">
        Time {time}. Only perfect runs, with every point and no mistakes, set a time record.
      </p>
    )
  }
  const record = previousTime === undefined || runTime(game) < previousTime
  return (
    <>
      <p className="run-time">
        Perfect run in <strong>{time}</strong>
      </p>
      {record ? (
        <p className="new-best">{previousTime === undefined ? 'Your first time record!' : 'New time record!'}</p>
      ) : (
        <p className="muted">Your record is {formatRunTime(previousTime)}</p>
      )}
    </>
  )
}
