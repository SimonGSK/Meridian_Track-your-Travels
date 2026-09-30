import { useCallback, useState } from 'react'
import type { CountryFeature } from '../countries'
import { usePersistentState } from '../storage'
import { answer, newGame, next, type GameId, type GameState } from './games'

export const BEST_SCORES_KEY = 'countries-app.best-scores'

export type BestScores = Partial<Record<GameId, number>>

const isBestScores = (value: unknown): value is BestScores =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((n) => typeof n === 'number')

/** The game being played, if any, plus best scores saved in this browser. */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null)
  const [best, setBest] = usePersistentState<BestScores>(BEST_SCORES_KEY, {}, isBestScores)
  // Best score before the current game started, to celebrate beating it
  const [previousBest, setPreviousBest] = useState<number | undefined>(undefined)

  const start = useCallback(
    (id: GameId) => {
      setPreviousBest(best[id])
      setGame(newGame(id))
    },
    [best],
  )

  const pick = useCallback((country: CountryFeature) => setGame((g) => g && answer(g, country)), [])

  const advance = useCallback(() => {
    if (!game) return
    const after = next(game)
    setGame(after)
    if (after.finished && after.score > (best[after.id] ?? -1)) setBest({ ...best, [after.id]: after.score })
  }, [game, best, setBest])

  const quit = useCallback(() => setGame(null), [])

  return { game, best, previousBest, start, pick, advance, quit }
}
