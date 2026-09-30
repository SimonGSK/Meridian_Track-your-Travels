import { countries, type CountryFeature } from '../countries'
import { flagUrl } from '../flags'

export type GameId = 'find' | 'flags' | 'name' | 'shape' | 'letter'
export type RoundGameId = Exclude<GameId, 'letter'>
export type Difficulty = 'easy' | 'medium' | 'hard'

export const GAMES: { id: GameId; title: string; description: string }[] = [
  { id: 'find', title: 'Find the country', description: 'We name a country, you click it on the globe.' },
  { id: 'letter', title: 'Letter hunt', description: 'Click every country that starts with a letter.' },
  { id: 'flags', title: 'Flag quiz', description: 'Which country has this flag?' },
  { id: 'name', title: 'Name that country', description: 'A country lights up on the globe. Which one is it?' },
  { id: 'shape', title: 'Shape quiz', description: 'Name the country from its outline alone.' },
]

export const DIFFICULTIES: { id: Difficulty; label: string; description: string }[] = [
  { id: 'easy', label: 'Easy', description: 'Big countries. Pick from four answers.' },
  { id: 'medium', label: 'Medium', description: 'All but the smallest countries. Type your answers.' },
  { id: 'hard', label: 'Hard', description: 'All 197 countries, even the tiniest. Type your answers.' },
]

export const ROUNDS = 10
export const OPTION_COUNT = 4

/** Smallest country (km²) in each difficulty; hard has them all */
const MIN_AREA_KM2: Record<Difficulty, number> = { easy: 100_000, medium: 5_000, hard: 0 }

type Random = () => number

const allCountries = countries.filter((c) => c.properties.kind === 'country')

/** The countries a game can ask about at a difficulty. */
export function gamePool(id: GameId, difficulty: Difficulty): CountryFeature[] {
  return allCountries.filter(
    (c) => c.properties.areaKm2 >= MIN_AREA_KM2[difficulty] && (id !== 'flags' || flagUrl(c)),
  )
}

/** Easy games pick from four answers; harder ones are typed. Finding is always done on the globe. */
export function answerMode(id: GameId, difficulty: Difficulty): 'globe' | 'choices' | 'typing' {
  if (id === 'find' || id === 'letter') return 'globe'
  return difficulty === 'easy' ? 'choices' : 'typing'
}

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ── Games played in rounds: find, flags, name, shape ─────────────────────────

export type Round = {
  target: CountryFeature
  /** Answer choices, including the target. Empty unless answering by choosing. */
  options: CountryFeature[]
}

export type Answer = {
  picked: CountryFeature
  correct: boolean
  /** The name typed, when it's an older or alternative name, e.g. "Swaziland" */
  alias: string | null
}

export type RoundGameState = {
  kind: 'rounds'
  id: RoundGameId
  difficulty: Difficulty
  rounds: Round[]
  index: number
  score: number
  /** Set once the current round is answered */
  answer: Answer | null
  finished: boolean
}

export function newRoundGame(
  id: RoundGameId,
  difficulty: Difficulty,
  random: Random = Math.random,
  pool = gamePool(id, difficulty),
): RoundGameState {
  const targets = shuffle(pool, random).slice(0, ROUNDS)
  const withChoices = answerMode(id, difficulty) === 'choices'
  const rounds = targets.map((target) => ({
    target,
    options: withChoices
      ? shuffle([target, ...shuffle(pool.filter((c) => c !== target), random).slice(0, OPTION_COUNT - 1)], random)
      : [],
  }))
  return { kind: 'rounds', id, difficulty, rounds, index: 0, score: 0, answer: null, finished: false }
}

export const currentRound = (game: RoundGameState) => game.rounds[game.index]

/** Answer the current round. Later answers to the same round are ignored. */
export function answer(game: RoundGameState, picked: CountryFeature, alias: string | null = null): RoundGameState {
  if (game.answer || game.finished) return game
  const correct = picked === currentRound(game).target
  return { ...game, answer: { picked, correct, alias }, score: game.score + (correct ? 1 : 0) }
}

/** Move on to the next round once the current one is answered. */
export function next(game: RoundGameState): RoundGameState {
  if (!game.answer) return game
  if (game.index + 1 >= game.rounds.length) return { ...game, finished: true }
  return { ...game, index: game.index + 1, answer: null }
}
