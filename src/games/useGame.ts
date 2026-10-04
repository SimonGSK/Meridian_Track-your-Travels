import { useCallback, useState } from 'react'
import type { CountryFeature } from '../countries'
import { usePersistentState } from '../storage'
import {
  answer,
  dontKnow,
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

export type GameState = RoundGameState | LetterGameState | AllGameState

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
function keyOf(game: GameState) {
  if (game.kind === 'letter') return letterKey(game.letter)
  if (game.kind === 'all') return scopeKey(game.scope)
  return bestKey(game.id, game.difficulty)
}

export const isBestScores = (value: unknown): value is BestScores =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((n) => typeof n === 'number')

/** Points, or for the letter hunt and "name them all" the number of countries found */
export const gameScore = (game: GameState) => (game.kind === 'rounds' ? game.score : game.found.length)

/**
 * The game being played, if any, plus the best scores and the fastest
 * perfect runs saved in this browser.
 */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [best, setBest] = usePersistentState<BestScores>(BEST_SCORES_KEY, {}, isBestScores)
  const [bestTimes, setBestTimes] = usePersistentState<BestScores>(BEST_TIMES_KEY, {}, isBestScores)
  // The bests before the current game started, to celebrate beating them
  const [previousBest, setPreviousBest] = useState<number | undefined>(undefined)
  const [previousTime, setPreviousTime] = useState<number | undefined>(undefined)

  const update = useCallback(
    (after: GameState) => {
      setGame(after)
      if (!after.finished || game?.finished) return
      const key = keyOf(after)
      if (gameScore(after) > (best[key] ?? -1)) setBest({ ...best, [key]: gameScore(after) })
      if (isPerfect(after) && runTime(after) < (bestTimes[key] ?? Infinity)) {
        setBestTimes({ ...bestTimes, [key]: runTime(after) })
      }
    },
    [game, best, setBest, bestTimes, setBestTimes],
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

  /** Answer a round, or click a country in the letter hunt. `alias` is the name typed, if not the usual one. */
  const pick = useCallback(
    (country: CountryFeature, alias: string | null = null) => {
      if (!game) return
      if (game.kind === 'letter') update(pickCountry(game, country))
      else if (game.kind === 'all') update(nameCountry(game, country, alias))
      else update(answer(game, country, alias))
    },
    [game, update],
  )

  /** Next round, or give up the letter hunt or "name them all" */
  const advance = useCallback(() => {
    if (!game) return
    if (game.kind === 'letter') update(giveUp(game))
    else if (game.kind === 'all') update(giveUpAll(game))
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
    start,
    startLetter,
    startAll,
    pick,
    giveUpRound,
    advance,
    stop,
    quit,
  }
}
