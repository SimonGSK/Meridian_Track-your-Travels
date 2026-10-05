import { describe, expect, it } from 'vitest'
import { formatRunTime, isPerfect, runTime } from './records'
import { answer, currentRound, dontKnow, newRoundGame, next, stopEarly, type RoundGameState } from './games'
import { giveUp, newLetterGame, pickCountry } from './letterGame'
import { giveUpAll, nameCountry, newAllGame } from './allGame'
import { countries } from '../countries'
import { guessCity, newCityGame, nextCity, skipCity } from './cityGame'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const pool = ['Denmark', 'France', 'Brazil'].map(byName)
const wrongFor = (game: RoundGameState) => pool.find((c) => c !== currentRound(game).target)!

/** Plays every round, answering each at `at(i)` seconds, with `pick` choosing the answers */
function play(game: RoundGameState, pick: (game: RoundGameState, i: number) => RoundGameState) {
  for (let i = 0; i < game.rounds.length; i++) game = next(pick(game, i))
  return game
}
const right = (at: (i: number) => number) => (game: RoundGameState, i: number) =>
  answer(game, currentRound(game).target, null, at(i) * 1000)

describe('isPerfect', () => {
  it('needs every round right, played to the end', () => {
    const start = newRoundGame('flags', 'hard', () => 0.5, pool, 0)
    expect(isPerfect(play(start, right((i) => i)))).toBe(true)
    expect(isPerfect(play(start, (g, i) => (i === 1 ? answer(g, wrongFor(g)) : right(() => 1)(g, i))))).toBe(false)
    expect(isPerfect(play(start, (g, i) => (i === 2 ? dontKnow(g) : right(() => 1)(g, i))))).toBe(false)
    expect(isPerfect(stopEarly(next(right(() => 1)(start, 0))))).toBe(false)
    expect(isPerfect(start)).toBe(false)
  })

  it('needs every country on the first try in "find the country"', () => {
    const start = newRoundGame('find', 'easy', () => 0.5, pool, 0)
    expect(isPerfect(play(start, right(() => 1)))).toBe(true)
    const secondTry = play(start, (g, i) => (i === 0 ? right(() => 1)(answer(g, wrongFor(g)), i) : right(() => 1)(g, i)))
    expect(secondTry.score).toBe(8)
    expect(isPerfect(secondTry)).toBe(false)
  })

  it('needs every country of the letter hunt without a wrong letter', () => {
    const start = newLetterGame('Z', 0)
    const [zambia, zimbabwe] = start.targets
    expect(isPerfect(pickCountry(pickCountry(start, zambia), zimbabwe))).toBe(true)
    expect(isPerfect(pickCountry(pickCountry(pickCountry(start, byName('Denmark')), zambia), zimbabwe))).toBe(false)
    expect(isPerfect(giveUp(pickCountry(start, zambia)))).toBe(false)
  })

  it('needs every country named in "name them all"', () => {
    const start = newAllGame('Oceania', 0)
    const named = start.targets.reduce((game, country) => nameCountry(game, country, null), start)
    expect(isPerfect(named)).toBe(true)
    expect(isPerfect(giveUpAll(nameCountry(start, start.targets[0], null)))).toBe(false)
  })
})

describe('runTime', () => {
  it('runs from the start to the last answer, not to the results', () => {
    const game = play(newRoundGame('shape', 'hard', () => 0.5, pool, 1_000), right((i) => 10 + i * 5))
    expect(runTime(game)).toBe(19_000)
  })

  it('ends when a game is stopped or given up', () => {
    const stopped = stopEarly(next(right(() => 3)(newRoundGame('flags', 'all', () => 0.5, pool, 0), 0)), 7_000)
    expect(runTime(stopped)).toBe(7_000)
    expect(runTime(giveUp(newLetterGame('Z', 0), 12_500))).toBe(12_500)
  })
})

describe('formatRunTime', () => {
  it('shows minutes, seconds and tenths', () => {
    expect(formatRunTime(42_380)).toBe('0:42.3')
    expect(formatRunTime(5_000)).toBe('0:05.0')
    expect(formatRunTime(754_999)).toBe('12:34.9')
  })
})

describe('isPerfect, finding cities', () => {
  const paris = { id: 2988507, name: 'Paris', place: 'FR', lat: 48.85, lng: 2.35, population: 2_138_551, capital: true as const }

  it('needs every city spot on', () => {
    const game = newCityGame('medium', [paris])
    expect(isPerfect(nextCity(guessCity(game, { lat: 48.9, lng: 2.4 })))).toBe(true)
    expect(isPerfect(nextCity(guessCity(game, { lat: 50, lng: 3 })))).toBe(false)
    expect(isPerfect(nextCity(skipCity(game)))).toBe(false)
  })
})
