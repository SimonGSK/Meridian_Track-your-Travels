import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import {
  NEIGHBOURS_ROUNDS,
  borderingCountries,
  currentNeighbours,
  missingNeighbours,
  nameNeighbour,
  namedNeighbours,
  neighboursPercent,
  neighboursPool,
  newNeighboursGame,
  nextNeighbours,
  showRest,
  totalNeighbours,
  type NeighboursState,
} from './neighboursGame'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const names = (list: { properties: { name: string } }[]) => list.map((c) => c.properties.name)

/** A game about these countries, in this order */
function gameOf(...countryNames: string[]): NeighboursState {
  const game = newNeighboursGame('medium', Math.random, 1_000)
  return { ...game, rounds: countryNames.map((n) => ({ country: byName(n), neighbours: borderingCountries(byName(n)) })) }
}

describe('borderingCountries', () => {
  it('names the countries sharing a land border, by name, without territories', () => {
    expect(names(borderingCountries(byName('Germany')))).toEqual([
      'Austria',
      'Belgium',
      'Czechia',
      'Denmark',
      'France',
      'Luxembourg',
      'Netherlands',
      'Poland',
      'Switzerland',
    ])
    expect(borderingCountries(byName('China'))).toHaveLength(14) // not Hong Kong or Macao
    expect(names(borderingCountries(byName('France')))).toContain('Brazil') // by French Guiana
    expect(borderingCountries(byName('Iceland'))).toEqual([])
  })
})

describe('neighboursPool', () => {
  it('has big countries with few neighbours on easy, and many neighbours on hard', () => {
    const easy = names(neighboursPool('easy'))
    expect(easy).toEqual(expect.arrayContaining(['Spain', 'United States', 'Sweden', 'Canada']))
    expect(easy).not.toContain('Germany') // nine neighbours
    expect(easy).not.toContain('Denmark') // small
    const hard = names(neighboursPool('hard'))
    expect(hard).toEqual(expect.arrayContaining(['Germany', 'China', 'Brazil']))
    expect(hard).not.toContain('Spain')
    expect(neighboursPool('medium').every((c) => borderingCountries(c).length <= 6)).toBe(true)
    for (const level of ['easy', 'medium', 'hard'] as const) expect(neighboursPool(level).length).toBeGreaterThan(NEIGHBOURS_ROUNDS)
  })

  it('never asks about an island without neighbours', () => {
    expect(names(neighboursPool('medium'))).not.toContain('Iceland')
  })
})

describe('a game', () => {
  it('has five different countries, and counts their neighbours', () => {
    const game = newNeighboursGame('hard')
    expect(game.rounds).toHaveLength(5)
    expect(new Set(game.rounds.map((r) => r.country)).size).toBe(5)
    expect(totalNeighbours(game)).toBe(game.rounds.reduce((sum, r) => sum + r.neighbours.length, 0))
  })

  it('counts neighbours named, and only once', () => {
    let game = gameOf('Spain', 'Haiti')
    game = nameNeighbour(game, byName('France'))
    expect(game.last).toMatchObject({ result: 'found' })
    expect(names(game.found)).toEqual(['France'])
    game = nameNeighbour(game, byName('France'))
    expect(game.last).toMatchObject({ result: 'again' })
    expect(game.found).toHaveLength(1)
    expect(namedNeighbours(game)).toBe(1)
  })

  it('counts another country as a mistake, but not a territory or the country itself', () => {
    let game = gameOf('Spain', 'Haiti')
    game = nameNeighbour(game, byName('Italy'))
    expect(game).toMatchObject({ mistakes: 1, last: { result: 'not-neighbour' } })
    game = nameNeighbour(game, byName('Spain'))
    expect(game).toMatchObject({ mistakes: 1, last: { result: 'itself' } })
    game = nameNeighbour(game, countries.find((c) => c.properties.kind !== 'country')!)
    expect(game).toMatchObject({ mistakes: 1, last: { result: 'territory' } })
  })

  it('ends the round when every neighbour is named, and the game after the last', () => {
    let game = gameOf('Haiti', 'Ireland')
    game = nameNeighbour(game, byName('Dominican Republic'), null, 2_000)
    expect(game).toMatchObject({ roundOver: true, scores: [1], endedAt: null })
    expect(nameNeighbour(game, byName('Cuba'))).toBe(game) // over: no more names
    game = nextNeighbours(game)
    expect(currentNeighbours(game).country).toBe(byName('Ireland'))
    expect(game.found).toEqual([])
    game = nameNeighbour(game, byName('United Kingdom'), 'UK', 3_000)
    expect(game).toMatchObject({ roundOver: true, scores: [1, 1], endedAt: 3_000 })
    expect(game.last).toMatchObject({ alias: 'UK' })
    game = nextNeighbours(game)
    expect(game.finished).toBe(true)
    expect(neighboursPercent(game)).toBe(100)
  })

  it('shows the rest of a round, keeping what was named', () => {
    let game = gameOf('Spain', 'Haiti')
    expect(nextNeighbours(game)).toBe(game) // not over yet
    game = nameNeighbour(game, byName('Portugal'))
    game = showRest(game)
    expect(game).toMatchObject({ roundOver: true, gaveUp: true, scores: [1] })
    expect(names(missingNeighbours(game))).toEqual(['Andorra', 'France'])
    // One of Spain's three and none of Haiti's yet: 1 of 4
    expect(neighboursPercent(game)).toBe(25)
  })
})
