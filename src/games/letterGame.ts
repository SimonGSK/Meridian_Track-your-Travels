import type { CountryFeature } from '../countries'
import { gamePool, shuffle, type Difficulty } from './games'

/** Letters need at least this many countries to be worth a round */
const MIN_TARGETS = 3

export type LetterGameState = {
  kind: 'letter'
  id: 'letter'
  difficulty: Difficulty
  letter: string
  /** Countries to find: those starting with the letter at this difficulty, plus any others found */
  targets: CountryFeature[]
  found: CountryFeature[]
  mistakes: number
  /** Feedback on the last click */
  last: { country: CountryFeature; result: 'found' | 'again' | 'wrong-letter' | 'territory' } | null
  finished: boolean
  gaveUp: boolean
}

type Random = () => number

export const startsWith = (country: CountryFeature, letter: string) =>
  country.properties.name.normalize('NFD').toUpperCase().startsWith(letter)

/** Letters with enough countries at a difficulty, and those countries. */
export function lettersFor(difficulty: Difficulty) {
  const byLetter = new Map<string, CountryFeature[]>()
  for (const country of gamePool('letter', difficulty)) {
    const letter = country.properties.name.normalize('NFD')[0].toUpperCase()
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), country])
  }
  return new Map([...byLetter].filter(([, list]) => list.length >= MIN_TARGETS))
}

export function newLetterGame(difficulty: Difficulty, random: Random = Math.random): LetterGameState {
  const letters = lettersFor(difficulty)
  const [letter] = shuffle([...letters.keys()], random)
  return {
    kind: 'letter',
    id: 'letter',
    difficulty,
    letter,
    targets: letters.get(letter)!,
    found: [],
    mistakes: 0,
    last: null,
    finished: false,
    gaveUp: false,
  }
}

/**
 * A click on a country. Any country starting with the letter counts, even
 * one too small to be expected at this difficulty.
 */
export function pickCountry(game: LetterGameState, country: CountryFeature): LetterGameState {
  if (game.finished) return game
  if (game.found.includes(country)) return { ...game, last: { country, result: 'again' } }
  if (!startsWith(country, game.letter)) {
    return { ...game, mistakes: game.mistakes + 1, last: { country, result: 'wrong-letter' } }
  }
  if (country.properties.kind !== 'country') {
    return { ...game, mistakes: game.mistakes + 1, last: { country, result: 'territory' } }
  }
  const found = [...game.found, country]
  const targets = game.targets.includes(country) ? game.targets : [...game.targets, country]
  return { ...game, found, targets, last: { country, result: 'found' }, finished: found.length === targets.length }
}

export function giveUp(game: LetterGameState): LetterGameState {
  return game.finished ? game : { ...game, finished: true, gaveUp: true }
}

/** Share of the countries found, as a whole percentage */
export const letterScore = (game: LetterGameState) => Math.round((game.found.length / game.targets.length) * 100)

export const missing = (game: LetterGameState) => game.targets.filter((c) => !game.found.includes(c))
