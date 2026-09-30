import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { giveUp, letterScore, lettersFor, missing, newLetterGame, pickCountry, startsWith } from './letterGame'
import type { Difficulty } from './games'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!

/** A game for a chosen letter */
function gameFor(letter: string, difficulty: Difficulty = 'medium') {
  for (let seed = 0; seed < 1000; seed++) {
    let s = seed + 1
    const game = newLetterGame(difficulty, () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646)
    if (game.letter === letter) return game
  }
  throw new Error(`No game for ${letter}`)
}

describe('lettersFor', () => {
  it('only offers letters with at least three countries', () => {
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      for (const [, list] of lettersFor(d)) expect(list.length).toBeGreaterThanOrEqual(3)
    }
    expect(lettersFor('hard').has('Q')).toBe(false) // only Qatar
  })

  it('groups countries by their first letter, ignoring accents', () => {
    const c = lettersFor('hard').get('C')!.map((x) => x.properties.name)
    expect(c).toContain("Côte d'Ivoire")
    expect(c).toContain('Canada')
    expect(startsWith(byName('Türkiye'), 'T')).toBe(true)
  })
})

describe('letter hunt', () => {
  it('asks for every country with the letter at the difficulty', () => {
    const game = gameFor('K', 'hard')
    expect(game.targets.map((c) => c.properties.name).sort()).toEqual(
      countries
        .filter((c) => c.properties.kind === 'country' && c.properties.name.startsWith('K'))
        .map((c) => c.properties.name)
        .sort(),
    )
  })

  it('counts a country with the right letter', () => {
    const game = pickCountry(gameFor('K'), byName('Kenya'))
    expect(game.found.map((c) => c.properties.name)).toEqual(['Kenya'])
    expect(game.last).toMatchObject({ result: 'found' })
    expect(game.mistakes).toBe(0)
  })

  it('counts a wrong letter as a mistake', () => {
    const game = pickCountry(gameFor('K'), byName('Denmark'))
    expect(game.found).toEqual([])
    expect(game.mistakes).toBe(1)
    expect(game.last).toMatchObject({ result: 'wrong-letter' })
  })

  it('does not count territories', () => {
    const game = pickCountry(gameFor('G'), byName('Greenland'))
    expect(game.found).toEqual([])
    expect(game.last).toMatchObject({ result: 'territory' })
  })

  it('ignores a country found twice, without a mistake', () => {
    const once = pickCountry(gameFor('K'), byName('Kenya'))
    const twice = pickCountry(once, byName('Kenya'))
    expect(twice.found).toHaveLength(1)
    expect(twice.mistakes).toBe(0)
    expect(twice.last).toMatchObject({ result: 'again' })
  })

  it('also counts small countries not expected on easy', () => {
    const game = gameFor('K', 'easy')
    expect(game.targets).not.toContain(byName('Kiribati'))
    const after = pickCountry(game, byName('Kiribati'))
    expect(after.found).toContain(byName('Kiribati'))
    expect(after.targets).toContain(byName('Kiribati'))
  })

  it('finishes when every country is found', () => {
    let game = gameFor('K')
    for (const country of game.targets) game = pickCountry(game, country)
    expect(game.finished).toBe(true)
    expect(game.gaveUp).toBe(false)
    expect(letterScore(game)).toBe(100)
  })

  it('can be given up, showing what was missed', () => {
    const game = giveUp(pickCountry(gameFor('K'), byName('Kenya')))
    expect(game).toMatchObject({ finished: true, gaveUp: true })
    expect(missing(game)).not.toContain(byName('Kenya'))
    expect(missing(game).length).toBe(game.targets.length - 1)
    expect(letterScore(game)).toBe(Math.round((1 / game.targets.length) * 100))
  })

  it('ignores clicks once finished', () => {
    const game = giveUp(gameFor('K'))
    expect(pickCountry(game, byName('Kenya'))).toBe(game)
  })
})
