import { geoArea } from 'd3-geo'
import { countries, type CountryFeature } from '../countries'
import { flagUrl } from '../flags'

export type GameId = 'find' | 'flags' | 'name'

export const GAMES: { id: GameId; title: string; description: string }[] = [
  { id: 'find', title: 'Find the country', description: 'We name a country, you click it on the globe.' },
  { id: 'flags', title: 'Flag quiz', description: 'Which country flies this flag?' },
  { id: 'name', title: 'Name that country', description: 'A country lights up on the globe. Which one is it?' },
]

export const ROUNDS = 10
export const OPTION_COUNT = 4

/** Smaller countries are too hard to spot or click on the globe */
const MIN_AREA_KM2 = 5000
const EARTH_AREA_KM2 = 510_072_000

export type Round = {
  target: CountryFeature
  /** Answer choices, including the target. Empty when you answer by clicking the globe. */
  options: CountryFeature[]
}

export type GameState = {
  id: GameId
  rounds: Round[]
  index: number
  score: number
  /** Set once the current round is answered */
  answer: { picked: CountryFeature; correct: boolean } | null
  finished: boolean
}

type Random = () => number

const areaKm2 = (country: CountryFeature) => (geoArea(country) / (4 * Math.PI)) * EARTH_AREA_KM2
const isCountry = (country: CountryFeature) =>
  country.properties.isoCode !== null && country.properties.name !== 'Antarctica'

/** The countries a game can ask about. */
export function gamePool(id: GameId): CountryFeature[] {
  if (id === 'flags') return countries.filter((c) => isCountry(c) && flagUrl(c))
  return countries.filter((c) => isCountry(c) && areaKm2(c) >= MIN_AREA_KM2)
}

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function newGame(id: GameId, random: Random = Math.random, pool = gamePool(id)): GameState {
  const targets = shuffle(pool, random).slice(0, ROUNDS)
  const rounds = targets.map((target) => ({
    target,
    options:
      id === 'find'
        ? []
        : shuffle(
            [target, ...shuffle(pool.filter((c) => c !== target), random).slice(0, OPTION_COUNT - 1)],
            random,
          ),
  }))
  return { id, rounds, index: 0, score: 0, answer: null, finished: false }
}

export const currentRound = (game: GameState) => game.rounds[game.index]

/** Answer the current round. Later answers to the same round are ignored. */
export function answer(game: GameState, picked: CountryFeature): GameState {
  if (game.answer || game.finished) return game
  const correct = picked === currentRound(game).target
  return { ...game, answer: { picked, correct }, score: game.score + (correct ? 1 : 0) }
}

/** Move on to the next round once the current one is answered. */
export function next(game: GameState): GameState {
  if (!game.answer) return game
  if (game.index + 1 >= game.rounds.length) return { ...game, finished: true }
  return { ...game, index: game.index + 1, answer: null }
}
