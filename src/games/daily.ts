import type { CountryFeature } from '../countries'
import { OPTION_COUNT, gamePool, kindOf, shuffle, type QuizKind, type RoundGameState } from './games'

/**
 * The daily challenge: five rounds, one of each quiz, about countries
 * picked from the date, so everyone gets the same ones that day. One go a
 * day; the result can be shared as squares, like Wordle's.
 */

/** The quizzes of the day, in order: the first on the globe, the rest picked from four answers */
export const DAILY_KINDS: QuizKind[] = ['find', 'flags', 'capital', 'shape', 'name']

/** A day, by its local date: "2026-10-05" */
export type DayKey = string

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (date: Date): DayKey => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** The day before or after, by `days` */
export function shiftDay(key: DayKey, days: number): DayKey {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + days))
}

/** A random number generator that gives the same numbers for the same day (mulberry32) */
export function seededRandom(key: DayKey) {
  let seed = [...key].reduce((hash, ch) => Math.imul(hash ^ ch.charCodeAt(0), 2654435761) >>> 0, 2166136261)
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The day's challenge: a different country for each quiz, from all but the smallest */
export function newDailyGame(key: DayKey, now = Date.now()): RoundGameState {
  const random = seededRandom(key)
  const used = new Set<CountryFeature>()
  const rounds = DAILY_KINDS.map((kind) => {
    const pool = gamePool(kind, 'medium').filter((c) => !used.has(c))
    const target = pool[Math.floor(random() * pool.length)]
    used.add(target)
    const options =
      kind === 'find'
        ? []
        : shuffle([target, ...shuffle(pool.filter((c) => c !== target), random).slice(0, OPTION_COUNT - 1)], random)
    return { kind, target, options }
  })
  return {
    kind: 'rounds',
    id: 'daily',
    // Easy, so the quizzes after the first are picked from four answers
    difficulty: 'easy',
    rounds,
    index: 0,
    score: 0,
    scores: [],
    answer: null,
    misses: [],
    notACountry: null,
    finished: false,
    stoppedEarly: false,
    startedAt: now,
    endedAt: null,
  }
}

/** How a day went, as saved */
export type DailyResult = { score: number; max: number; squares: string }
export type DailyResults = Record<DayKey, DailyResult>

export const DAILY_KEY = 'countries-app.daily'

export const isDailyResults = (value: unknown): value is DailyResults =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([key, r]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(key) &&
      typeof r === 'object' &&
      r !== null &&
      typeof r.score === 'number' &&
      typeof r.max === 'number' &&
      typeof r.squares === 'string',
  )

/**
 * A square for each round: green right first time, yellow or orange on the
 * second or third try (finding it on the globe), red wrong
 */
export function squaresOf(game: RoundGameState) {
  return game.scores
    .map((p, i) => {
      if (p === 0) return '🟥'
      if (kindOf(game, i) !== 'find' || p === 3) return '🟩'
      return p === 2 ? '🟨' : '🟧'
    })
    .join('')
}

const shareDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** What "Copy result" copies: "Meridian daily · 5 Oct 2026 · 6/7" and the squares */
export function shareText(key: DayKey, result: DailyResult) {
  const [y, m, d] = key.split('-').map(Number)
  return `Meridian daily · ${shareDate.format(new Date(y, m - 1, d))} · ${result.score}/${result.max}\n${result.squares}`
}

/** Days in a row played, up to today, or yesterday if today's isn't played yet; and the longest run */
export function streaksOf(results: DailyResults, today: DayKey) {
  const played = (key: DayKey) => key in results
  let current = 0
  for (let day = played(today) ? today : shiftDay(today, -1); played(day); day = shiftDay(day, -1)) current++
  let best = 0
  for (const key of Object.keys(results)) {
    if (played(shiftDay(key, -1))) continue // not the start of a run
    let run = 0
    for (let day = key; played(day); day = shiftDay(day, 1)) run++
    best = Math.max(best, run)
  }
  return { current, best, played: Object.keys(results).length }
}
