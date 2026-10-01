import { useCallback, useState } from 'react'
import type { CountryFeature } from '../countries'
import { usePersistentState } from '../storage'
import { answer, newRoundGame, next, type Difficulty, type GameId, type RoundGameId, type RoundGameState } from './games'
import { giveUp, newLetterGame, pickCountry, type LetterGameState } from './letterGame'
import { giveUpAll, nameCountry, newAllGame, type AllGameState, type Scope } from './allGame'

export type GameState = RoundGameState | LetterGameState | AllGameState

export const BEST_SCORES_KEY = 'countries-app.best-scores'

/** Best score per game and difficulty, keyed like "flags:hard" */
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

const isBestScores = (value: unknown): value is BestScores =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((n) => typeof n === 'number')

/** Points, or for the letter hunt and "name them all" the number of countries found */
export const gameScore = (game: GameState) => (game.kind === 'rounds' ? game.score : game.found.length)

/** The game being played, if any, plus best scores saved in this browser. */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [best, setBest] = usePersistentState<BestScores>(BEST_SCORES_KEY, {}, isBestScores)
  // Best score before the current game started, to celebrate beating it
  const [previousBest, setPreviousBest] = useState<number | undefined>(undefined)

  const update = useCallback(
    (after: GameState) => {
      setGame(after)
      if (!after.finished || game?.finished) return
      const key = keyOf(after)
      if (gameScore(after) > (best[key] ?? -1)) setBest({ ...best, [key]: gameScore(after) })
    },
    [game, best, setBest],
  )

  const start = useCallback(
    (id: RoundGameId, difficulty: Difficulty) => {
      setPreviousBest(best[bestKey(id, difficulty)])
      setGame(newRoundGame(id, difficulty))
    },
    [best],
  )

  const startAll = useCallback(
    (scope: Scope) => {
      setPreviousBest(best[scopeKey(scope)])
      setGame(newAllGame(scope))
    },
    [best],
  )

  const startLetter = useCallback(
    (letter: string) => {
      setPreviousBest(best[letterKey(letter)])
      setGame(newLetterGame(letter))
    },
    [best],
  )

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

  const quit = useCallback(() => setGame(null), [])

  return { game, best, previousBest, start, startLetter, startAll, pick, advance, quit }
}
