import { useCallback, useState } from 'react'
import type { CountryFeature } from '../countries'
import { usePersistentState } from '../storage'
import { answer, newRoundGame, next, type Difficulty, type GameId, type RoundGameState } from './games'
import { giveUp, letterScore, newLetterGame, pickCountry, type LetterGameState } from './letterGame'

export type GameState = RoundGameState | LetterGameState

export const BEST_SCORES_KEY = 'countries-app.best-scores'
export const DIFFICULTY_KEY = 'countries-app.difficulty'

/** Best score per game and difficulty, keyed like "flags:hard" */
export type BestScores = Record<string, number>
export const bestKey = (id: GameId, difficulty: Difficulty) => `${id}:${difficulty}`

const isBestScores = (value: unknown): value is BestScores =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((n) => typeof n === 'number')

const isDifficulty = (value: unknown): value is Difficulty => value === 'easy' || value === 'medium' || value === 'hard'

/** Rounds won, or for the letter hunt the share of countries found (%) */
export const gameScore = (game: GameState) => (game.kind === 'letter' ? letterScore(game) : game.score)

/** The game being played, if any, plus the chosen difficulty and best scores, saved in this browser. */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [difficulty, setDifficulty] = usePersistentState<Difficulty>(DIFFICULTY_KEY, 'easy', isDifficulty)
  const [best, setBest] = usePersistentState<BestScores>(BEST_SCORES_KEY, {}, isBestScores)
  // Best score before the current game started, to celebrate beating it
  const [previousBest, setPreviousBest] = useState<number | undefined>(undefined)

  const update = useCallback(
    (after: GameState) => {
      setGame(after)
      if (!after.finished || game?.finished) return
      const key = bestKey(after.id, after.difficulty)
      if (gameScore(after) > (best[key] ?? -1)) setBest({ ...best, [key]: gameScore(after) })
    },
    [game, best, setBest],
  )

  const start = useCallback(
    (id: GameId) => {
      setPreviousBest(best[bestKey(id, difficulty)])
      setGame(id === 'letter' ? newLetterGame(difficulty) : newRoundGame(id, difficulty))
    },
    [best, difficulty],
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

  return { game, difficulty, setDifficulty, best, previousBest, start, pick, advance, quit }
}
