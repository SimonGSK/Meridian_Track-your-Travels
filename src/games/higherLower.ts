import { countries, type CountryFeature } from '../countries'
import { factsOf } from '../data/facts'

/**
 * Higher or lower: you know one country's population (or area), and guess
 * whether the next has more or fewer. Right, and that one's figure is the
 * next to beat; wrong, and the run is over. The score is how many in a row.
 */

/** What's compared: how many people, or how big */
export type Measure = 'people' | 'area'
export const MEASURES: Measure[] = ['people', 'area']

export type Guess = 'more' | 'fewer'

export type HigherLowerState = {
  kind: 'higher'
  id: 'higher'
  measure: Measure
  /** The country whose figure you know */
  known: CountryFeature
  /** The country to guess about */
  next: CountryFeature
  /** Right guesses in a row */
  streak: number
  /** Your guess about `next`, once made */
  answer: { guess: Guess; correct: boolean } | null
  /** Every country shown so far, so none comes twice in a run */
  seen: CountryFeature[]
  /** Over at the first wrong guess, or when every country has been shown */
  finished: boolean
  startedAt: number
  endedAt: number | null
}

type Random = () => number

/** A country's population, or its area in km² */
export function valueOf(country: CountryFeature, measure: Measure) {
  const facts = factsOf(country)
  return measure === 'people' ? (facts?.population ?? 0) : (facts?.areaKm2 ?? country.properties.areaKm2)
}

/** The countries in the game: all 197, as every one has its figures */
export const higherLowerPool = (measure: Measure) =>
  countries.filter((c) => c.properties.kind === 'country' && valueOf(c, measure) > 0)

/** A country not shown yet whose figure isn't the same as the one to beat, or null when they've all been shown */
function pickNext(measure: Measure, known: CountryFeature, seen: readonly CountryFeature[], random: Random) {
  const candidates = higherLowerPool(measure).filter(
    (c) => !seen.includes(c) && valueOf(c, measure) !== valueOf(known, measure),
  )
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null
}

export function newHigherLower(measure: Measure, random: Random = Math.random, now = Date.now()): HigherLowerState {
  const pool = higherLowerPool(measure)
  const known = pool[Math.floor(random() * pool.length)]
  const next = pickNext(measure, known, [known], random)!
  return {
    kind: 'higher',
    id: 'higher',
    measure,
    known,
    next,
    streak: 0,
    answer: null,
    seen: [known, next],
    finished: false,
    startedAt: now,
    endedAt: null,
  }
}

/** Whether `next` has more people (or area) than `known` */
export const isMore = (game: Pick<HigherLowerState, 'known' | 'next' | 'measure'>) =>
  valueOf(game.next, game.measure) > valueOf(game.known, game.measure)

/** Guess more or fewer: a wrong guess ends the run */
export function guess(game: HigherLowerState, guess: Guess, now = Date.now()): HigherLowerState {
  if (game.answer || game.finished) return game
  const correct = (guess === 'more') === isMore(game)
  return {
    ...game,
    answer: { guess, correct },
    streak: correct ? game.streak + 1 : game.streak,
    finished: !correct,
    endedAt: correct ? null : now,
  }
}

/** After a right guess: the country just guessed is the one to beat, against a new one */
export function nextPair(game: HigherLowerState, random: Random = Math.random, now = Date.now()): HigherLowerState {
  if (!game.answer?.correct || game.finished) return game
  const next = pickNext(game.measure, game.next, game.seen, random)
  // Every country shown: a perfect run
  if (!next) return { ...game, finished: true, endedAt: now }
  return { ...game, known: game.next, next, answer: null, seen: [...game.seen, next] }
}
