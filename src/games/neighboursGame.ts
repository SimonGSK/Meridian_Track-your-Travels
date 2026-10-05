import { countries, neighborsOf, type CountryFeature } from '../countries'
import { shuffle } from './games'

/**
 * Neighbours: a country lights up on the globe, and you name every country
 * it shares a land border with, from memory. Territories don't count, as in
 * the other games. Five countries a game.
 */

export type NeighboursLevel = 'easy' | 'medium' | 'hard'

export const NEIGHBOURS_LEVELS: { id: NeighboursLevel; label: string; countries: string }[] = [
  { id: 'easy', label: 'Easy', countries: 'Big countries with up to four neighbours' },
  { id: 'medium', label: 'Medium', countries: 'Countries with up to six neighbours' },
  { id: 'hard', label: 'Hard', countries: 'Countries with five neighbours or more' },
]

export const NEIGHBOURS_ROUNDS = 5

const isCountry = (c: CountryFeature) => c.properties.kind === 'country'

/** The countries bordering a country, by name */
export const borderingCountries = (country: CountryFeature) =>
  neighborsOf(country)
    .filter(isCountry)
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))

/** Big, for the easy level (km²) */
const EASY_MIN_KM2 = 100_000

/** The countries a level asks about: all have at least one neighbour */
export function neighboursPool(level: NeighboursLevel): CountryFeature[] {
  return countries.filter((c) => {
    if (!isCountry(c)) return false
    const count = borderingCountries(c).length
    if (count === 0) return false
    if (level === 'easy') return count <= 4 && c.properties.areaKm2 >= EASY_MIN_KM2
    if (level === 'medium') return count <= 6
    return count >= 5
  })
}

export type NeighboursRound = { country: CountryFeature; neighbours: CountryFeature[] }

/** What became of the last name typed */
export type NeighbourResult = 'found' | 'again' | 'not-neighbour' | 'itself' | 'territory'

export type NeighboursState = {
  kind: 'neighbours'
  id: 'neighbours'
  level: NeighboursLevel
  rounds: NeighboursRound[]
  index: number
  /** This round's neighbours named, in the order named */
  found: CountryFeature[]
  /** Feedback on the last name typed */
  last: { country: CountryFeature; result: NeighbourResult; alias: string | null } | null
  /** All of this round's neighbours named, or the rest shown */
  roundOver: boolean
  /** Neighbours named in each round, once it's over */
  scores: number[]
  /** Names typed that don't border the country */
  mistakes: number
  /** A round's rest was shown rather than named */
  gaveUp: boolean
  finished: boolean
  startedAt: number
  endedAt: number | null
}

export function newNeighboursGame(level: NeighboursLevel, random: () => number = Math.random, now = Date.now()): NeighboursState {
  return {
    kind: 'neighbours',
    id: 'neighbours',
    level,
    rounds: shuffle(neighboursPool(level), random)
      .slice(0, NEIGHBOURS_ROUNDS)
      .map((country) => ({ country, neighbours: borderingCountries(country) })),
    index: 0,
    found: [],
    last: null,
    roundOver: false,
    scores: [],
    mistakes: 0,
    gaveUp: false,
    finished: false,
    startedAt: now,
    endedAt: null,
  }
}

export const currentNeighbours = (game: NeighboursState) => game.rounds[game.index]

/** Every neighbour in the game, and those named */
export const totalNeighbours = (game: NeighboursState) => game.rounds.reduce((sum, r) => sum + r.neighbours.length, 0)
export const namedNeighbours = (game: NeighboursState) =>
  game.scores.reduce((sum, n) => sum + n, 0) + (game.roundOver ? 0 : game.found.length)

/** The share of the game's neighbours named, as a whole percentage: the score kept as a best */
export const neighboursPercent = (game: NeighboursState) =>
  Math.round((namedNeighbours(game) / Math.max(1, totalNeighbours(game))) * 100)

/** This round's neighbours not named yet */
export const missingNeighbours = (game: NeighboursState) =>
  currentNeighbours(game).neighbours.filter((c) => !game.found.includes(c))

const isLast = (game: NeighboursState) => game.index === game.rounds.length - 1

/** The round is over: its score is kept, and after the last the clock stops */
function endRound(game: NeighboursState, now: number): NeighboursState {
  return { ...game, roundOver: true, scores: [...game.scores, game.found.length], endedAt: isLast(game) ? now : null }
}

/** A country named. Only a neighbour counts; any other country is a mistake, but a territory or a repeat isn't */
export function nameNeighbour(
  game: NeighboursState,
  country: CountryFeature,
  alias: string | null = null,
  now = Date.now(),
): NeighboursState {
  if (game.roundOver || game.finished) return game
  const round = currentNeighbours(game)
  const feedback = (result: NeighbourResult) => ({ country, result, alias })
  if (!isCountry(country)) return { ...game, last: feedback('territory') }
  if (country === round.country) return { ...game, last: feedback('itself') }
  if (game.found.includes(country)) return { ...game, last: feedback('again') }
  if (!round.neighbours.includes(country)) return { ...game, last: feedback('not-neighbour'), mistakes: game.mistakes + 1 }
  const named = { ...game, found: [...game.found, country], last: feedback('found') }
  return named.found.length === round.neighbours.length ? endRound(named, now) : named
}

/** Show the neighbours not named, ending the round */
export function showRest(game: NeighboursState, now = Date.now()): NeighboursState {
  if (game.roundOver || game.finished) return game
  return { ...endRound(game, now), gaveUp: true, last: null }
}

/** On to the next country once the round is over, or to the results after the last */
export function nextNeighbours(game: NeighboursState): NeighboursState {
  if (!game.roundOver) return game
  if (isLast(game)) return { ...game, finished: true }
  return { ...game, index: game.index + 1, found: [], last: null, roundOver: false }
}
