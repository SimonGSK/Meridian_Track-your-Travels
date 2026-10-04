import { useEffect, useState } from 'react'
import StatsBox from '../ui/StatsBox'
import { dayKey, shareText, streaksOf, type DailyResult, type DailyResults, type DayKey } from './daily'
import type { RoundGameState } from './games'

const dayLong = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const dateOf = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "5h 12m", to the next midnight here, counting down each minute */
function Countdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const minutes = Math.max(1, Math.ceil((midnight.getTime() - now) / 60_000))
  return (
    <span className="countdown">
      {Math.floor(minutes / 60)}h {minutes % 60}m
    </span>
  )
}

/** The streak so far, the longest, and days played */
function Streaks({ results, today }: { results: DailyResults; today: DayKey }) {
  const { current, best, played } = streaksOf(results, today)
  return (
    <StatsBox
      label="Your daily streaks"
      stats={[
        { label: 'Streak', value: current, title: 'Days in a row' },
        { label: 'Best streak', value: best },
        { label: 'Played', value: played },
      ]}
    />
  )
}

/** The squares and score of a day, with a button to copy them for sharing */
function Shareable({ day, result }: { day: DayKey; result: DailyResult }) {
  const [copied, setCopied] = useState(false)
  const text = shareText(day, result)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false) // no clipboard here: the result can be copied from the page
    }
  }
  return (
    <div className="daily-result">
      <p className="big-score">
        {result.score} / {result.max}
      </p>
      <p className="daily-squares" aria-label={`Rounds: ${result.squares}`}>
        {result.squares}
      </p>
      <button type="button" className="primary-button" onClick={copy}>
        {copied ? 'Copied' : 'Copy result'}
      </button>
    </div>
  )
}

/** Today's challenge, or how it went once played, with the streaks */
export function DailyChoice({ results, onPlay, onBack }: { results: DailyResults; onPlay: () => void; onBack: () => void }) {
  // Read once when shown: a challenge started just before midnight is still that day's
  const [today] = useState(() => dayKey(new Date()))
  const done = results[today]
  return (
    <div className="game">
      <button type="button" className="text-button" onClick={onBack}>
        ← All games
      </button>
      <h3 className="game-heading">Daily challenge</h3>
      <p className="muted">
        Five countries, one of each quiz: find it on the globe, then its flag, its capital, its shape, and a country lit
        up on the globe. The same for everyone today, and one go a day.
      </p>
      <p className="game-prompt">{dayLong.format(dateOf(today))}</p>
      {done ? (
        <>
          <Shareable day={today} result={done} />
          <p className="muted">
            Next challenge in <Countdown />
          </p>
        </>
      ) : (
        <button type="button" className="primary-button" onClick={onPlay}>
          Play today's challenge
        </button>
      )}
      <Streaks results={results} today={today} />
    </div>
  )
}

/** How today's challenge went, just played */
export function DailyResultsView({ game, results, onAllGames }: { game: RoundGameState; results: DailyResults; onAllGames: () => void }) {
  const day = dayKey(new Date(game.startedAt))
  const result = results[day]
  return (
    <div className="game game-results">
      <p className="game-title">
        <span>Daily challenge · {dayLong.format(dateOf(day))}</span>
      </p>
      {result && <Shareable day={day} result={result} />}
      <p className="muted">
        Next challenge in <Countdown />
      </p>
      <Streaks results={results} today={day} />
      <button type="button" className="text-button" onClick={onAllGames}>
        All games
      </button>
    </div>
  )
}
