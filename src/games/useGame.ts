import { useCallback, useState } from 'react'
import type { CountryFeature } from '../countries'
import { usePersistentState } from '../storage'
import {
  answer,
  dontKnow,
  maxScore,
  newRoundGame,
  next,
  stopEarly,
  type Difficulty,
  type GameId,
  type RoundGameId,
  type RoundGameState,
} from './games'
import { giveUp, newLetterGame, pickCountry, type LetterGameState } from './letterGame'
import { giveUpAll, nameCountry, newAllGame, type AllGameState, type Scope } from './allGame'
import { BEST_TIMES_KEY, isPerfect, runTime } from './records'
import { guess, newHigherLower, nextPair, type Guess, type HigherLowerState, type Measure } from './higherLower'
import { DAILY_KEY, dayKey, isDailyResults, newDailyGame, squaresOf, type DailyResults } from './daily'

export type GameState = RoundGameState | LetterGameState | AllGameState | HigherLowerState

export const BEST_SCORES_KEY = 'countries-app.best-scores'

/** Best score per game and difficulty, keyed like "flags:hard"; also the best times, in milliseconds */
export type BestScores = Record<string, number>
// "Find the country" used to score 1 per round; its points-based scores are kept apart
export const bestKey = (id: GameId, difficulty: Difficulty) =>
  id === 'find' ? `find-points:${difficulty}` : `${id}:${difficulty}`
/** The letter hunt keeps a best score (countries found) per letter */
export const letterKey = (letter: string) => `letter:${letter}`
/** "Name them all" keeps a best score (countries named) per continent, or the world */
export const scopeKey = (scope: Scope) => `all:${scope}`
/** Higher or lower keeps the longest streak for people, and for area */
export const measureKey = (measure: Measure) => `higher:${measure}`
function keyOf(game: GameState) {
  if (game.kind === 'letter') return letterKey(game.letter)
  if (game.kind === 'all') return scopeKey(game.scope)
  if (game.kind === 'higher') return measureKey(game.measure)
  return bestKey(game.id, game.difficulty)
}

export const isBestScores = (value: unknown): value is BestScores =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((n) => typeof n === 'number')

/** Points; for the letter hunt and "name them all" the number of countries found; for higher or lower the streak */
export function gameScore(game: GameState) {
  if (game.kind === 'rounds') return game.score
  if (game.kind === 'higher') return game.streak
  return game.found.length
}

/**
 * The game being played, if any, plus the best scores and the fastest
 * perfect runs saved in this browser.
 */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [best, setBest] = usePersistentState<BestScores>(BEST_SCORES_KEY, {}, isBestScores)
  const [bestTimes, setBestTimes] = usePersistentState<BestScores>(BEST_TIMES_KEY, {}, isBestScores)
  /** How each day's challenge went */
  const [daily, setDaily] = usePersistentState<DailyResults>(DAILY_KEY, {}, isDailyResults)
  // The bests before the current game started, to celebrate beating them
  const [previousBest, setPreviousBest] = useState<number | undefined>(undefined)
  const [previousTime, setPreviousTime] = useState<number | undefined>(undefined)

  const update = useCallback(
    (after: GameState) => {
      setGame(after)
      if (!after.finished || game?.finished) return
      // The daily challenge is kept by day, for its streaks, not as a best score or time
      if (after.kind === 'rounds' && after.id === 'daily') {
        const day = dayKey(new Date(after.startedAt))
        setDaily((prev) => ({ ...prev, [day]: { score: after.score, max: maxScore(after), squares: squaresOf(after) } }))
        return
      }
      const key = keyOf(after)
      if (gameScore(after) > (best[key] ?? -1)) setBest({ ...best, [key]: gameScore(after) })
      if (isPerfect(after) && runTime(after) < (bestTimes[key] ?? Infinity)) {
        setBestTimes({ ...bestTimes, [key]: runTime(after) })
      }
    },
    [game, best, setBest, bestTimes, setBestTimes, setDaily],
  )

  const begin = useCallback(
    (started: GameState) => {
      const key = keyOf(started)
      setPreviousBest(best[key])
      setPreviousTime(bestTimes[key])
      setGame(started)
    },
    [best, bestTimes],
  )

  const start = useCallback(
    (id: RoundGameId, difficulty: Difficulty) => begin(newRoundGame(id, difficulty)),
    [begin],
  )
  const startAll = useCallback((scope: Scope) => begin(newAllGame(scope)), [begin])
  const startLetter = useCallback((letter: string) => begin(newLetterGame(letter)), [begin])
  const startHigher = useCallback((measure: Measure) => begin(newHigherLower(measure)), [begin])
  /** Today's challenge, unless it's been played */
  const startDaily = useCallback(() => {
    const today = dayKey(new Date())
    if (!(today in daily)) begin(newDailyGame(today))
  }, [begin, daily])

  /** Higher or lower: more, or fewer */
  const guessHigher = useCallback(
    (direction: Guess) => {
      if (game?.kind === 'higher') update(guess(game, direction))
    },
    [game, update],
  )

  /** Answer a round, or click a country in the letter hunt. `alias` is the name typed, if not the usual one. */
  const pick = useCallback(
    (country: CountryFeature, alias: string | null = null) => {
      if (!game) return
      if (game.kind === 'letter') update(pickCountry(game, country))
      else if (game.kind === 'all') update(nameCountry(game, country, alias))
      else if (game.kind === 'rounds') update(answer(game, country, alias))
    },
    [game, update],
  )

  /** Next round, or give up the letter hunt or "name them all" */
  const advance = useCallback(() => {
    if (!game) return
    if (game.kind === 'letter') update(giveUp(game))
    else if (game.kind === 'all') update(giveUpAll(game))
    else if (game.kind === 'higher') update(nextPair(game))
    else update(next(game))
  }, [game, update])

  /** "I don't know": lose the round and see the answer */
  const giveUpRound = useCallback(() => {
    if (game?.kind === 'rounds') update(dontKnow(game))
  }, [game, update])

  /** End a game played in rounds now, scoring the rounds played */
  const stop = useCallback(() => {
    if (game?.kind === 'rounds') update(stopEarly(game))
  }, [game, update])

  const quit = useCallback(() => setGame(null), [])

  return {
    game,
    best,
    previousBest,
    bestTimes,
    previousTime,
    daily,
    startDaily,
    start,
    startLetter,
    startAll,
    startHigher,
    pick,
    guessHigher,
    giveUpRound,
    advance,
    stop,
    quit,
  }
}
