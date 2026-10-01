import { countries, type CountryFeature } from '../countries'
import { shuffle, type Difficulty } from './games'

/**
 * Each letter belongs to one difficulty, by how many countries start with it
 * and how well known they are. O, Q and Y are left out: only Oman, Qatar
 * and Yemen start with them, so there's nothing to hunt.
 */
export const LETTER_DIFFICULTY: Record<string, Difficulty> = {
  D: 'easy', F: 'easy', H: 'easy', J: 'easy', K: 'easy', R: 'easy', U: 'easy', V: 'easy', Z: 'easy',
  A: 'medium', E: 'medium', G: 'medium', I: 'medium', L: 'medium', N: 'medium', P: 'medium', T: 'medium',
  B: 'hard', C: 'hard', M: 'hard', S: 'hard',
}

export type LetterGameState = {
  kind: 'letter'
  id: 'letter'
  difficulty: Difficulty
  letter: string
  /** Every country starting with the letter */
  targets: CountryFeature[]
  found: CountryFeature[]
  mistakes: number
  /** Feedback on the last click */
  last: { country: CountryFeature; result: 'found' | 'again' | 'wrong-letter' | 'territory' } | null
  finished: boolean
  gaveUp: boolean
}

type Random = () => number

export const firstLetter = (country: CountryFeature) => country.properties.name.normalize('NFD')[0].toUpperCase()

export const startsWith = (country: CountryFeature, letter: string) => firstLetter(country) === letter

/** The countries starting with a letter, alphabetically */
export const countriesStartingWith = (letter: string) =>
  countries
    .filter((c) => c.properties.kind === 'country' && startsWith(c, letter))
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))

/** The letters of a difficulty, alphabetically */
export const lettersOf = (difficulty: Difficulty) =>
  Object.keys(LETTER_DIFFICULTY)
    .filter((letter) => LETTER_DIFFICULTY[letter] === difficulty)
    .sort()

export const randomLetter = (difficulty: Difficulty, random: Random = Math.random) =>
  shuffle(lettersOf(difficulty), random)[0]

export function newLetterGame(letter: string): LetterGameState {
  const difficulty = LETTER_DIFFICULTY[letter]
  if (!difficulty) throw new Error(`No letter hunt for ${letter}`)
  return {
    kind: 'letter',
    id: 'letter',
    difficulty,
    letter,
    targets: countriesStartingWith(letter),
    found: [],
    mistakes: 0,
    last: null,
    finished: false,
    gaveUp: false,
  }
}

/** A click on a country: found if it starts with the letter, a mistake if not. */
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
  return { ...game, found, last: { country, result: 'found' }, finished: found.length === game.targets.length }
}

export function giveUp(game: LetterGameState): LetterGameState {
  return game.finished ? game : { ...game, finished: true, gaveUp: true }
}

export const missing = (game: LetterGameState) => game.targets.filter((c) => !game.found.includes(c))
