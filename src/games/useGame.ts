import { useCallback, useState } from 'react'
import type { CountryFeature } from '../countries'
import { usePersistentState } from '../storage'
import { answer, newRoundGame, next, type Difficulty, type GameId, type RoundGameState } from './games'
import { giveUp, newLetterGame, pickCountry, type LetterGameState } from './letterGame'

export type GameState = RoundGameState | LetterGameState

export const BEST_SCORES_KEY = 'countries-app.best-scores'

/** Best score per game and difficulty, keyed like "flags:hard" */
export type BestScores = Record<string, number>
// "Find the country" used to score 1 per round; its points-based scores are kept apart
export const bestKey = (id: GameId, difficulty: Difficulty) =>
  id === 'find' ? `find-points:${difficulty}` : `${id}:${difficulty}`
/** The letter hunt keeps a best score (countries found) per letter */
export const letterKey = (letter: string) => `letter:${letter}`
const keyOf = (game: GameState) => (game.kind === 'letter' ? letterKey(game.letter) : bestKey(game.id, game.difficulty))

const isBestScores = (value: unknown): value is BestScores =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((n) => typeof n === 'number')

/** Points, or for the letter hunt the number of countries found */
export const gameScore = (game: GameState) => (game.kind === 'letter' ? game.found.length : game.score)

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
    (id: Exclude<GameId, 'letter'>, difficulty: Difficulty) => {
      setPreviousBest(best[bestKey(id, difficulty)])
      setGame(newRoundGame(id, difficulty))
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
      if (game) update(game.kind === 'letter' ? pickCountry(game, country) : answer(game, country, alias))
    },
    [game, update],
  )

  /** Next round, or give up the letter hunt */
  const advance = useCallback(() => {
    if (game) update(game.kind === 'letter' ? giveUp(game) : next(game))
  }, [game, update])

  const quit = useCallback(() => setGame(null), [])

  return { game, best, previousBest, start, startLetter, pick, advance, quit }
}
