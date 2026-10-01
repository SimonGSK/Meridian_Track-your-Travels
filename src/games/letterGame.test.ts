import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import {
  LETTER_DIFFICULTY,
  countriesStartingWith,
  giveUp,
  lettersOf,
  missing,
  newLetterGame,
  pickCountry,
  randomLetter,
  startsWith,
} from './letterGame'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const names = (list: { properties: { name: string } }[]) => list.map((c) => c.properties.name)

describe('letters', () => {
  it('puts each letter in exactly one difficulty', () => {
    const all = [...lettersOf('easy'), ...lettersOf('medium'), ...lettersOf('hard')]
    expect(new Set(all).size).toBe(all.length)
    expect(all.sort()).toEqual(Object.keys(LETTER_DIFFICULTY).sort())
  })

  it('makes the letters with the most countries the hardest', () => {
    const counts = (d: 'easy' | 'medium' | 'hard') => lettersOf(d).map((l) => countriesStartingWith(l).length)
    expect(Math.max(...counts('easy'))).toBeLessThan(Math.min(...counts('hard')))
    expect(lettersOf('hard')).toEqual(['B', 'C', 'M', 'S'])
  })

  it('has every letter with more than one country, and only those', () => {
    const letters = new Set(countries.filter((c) => c.properties.kind === 'country').map((c) => c.properties.name.normalize('NFD')[0]))
    for (const letter of letters) {
      const count = countriesStartingWith(letter).length
      expect(letter in LETTER_DIFFICULTY, `${letter} (${count})`).toBe(count > 1)
    }
  })

  it('matches first letters ignoring accents', () => {
    expect(names(countriesStartingWith('C'))).toContain("Côte d'Ivoire")
    expect(startsWith(byName('Türkiye'), 'T')).toBe(true)
  })

  it('picks a random letter of a difficulty', () => {
    expect(lettersOf('medium')).toContain(randomLetter('medium', () => 0.5))
  })
})

describe('letter hunt', () => {
  it('asks for every country starting with the letter', () => {
    const game = newLetterGame('K')
    expect(names(game.targets).sort()).toEqual(['Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan'])
    expect(game.difficulty).toBe('easy')
  })

  it('refuses a letter without a hunt', () => {
    expect(() => newLetterGame('Q')).toThrow('No letter hunt for Q')
  })

  it('counts a country with the right letter', () => {
    const game = pickCountry(newLetterGame('K'), byName('Kenya'))
    expect(names(game.found)).toEqual(['Kenya'])
    expect(game.last).toMatchObject({ result: 'found' })
    expect(game.mistakes).toBe(0)
  })

  it('counts a wrong letter as a mistake', () => {
    const game = pickCountry(newLetterGame('K'), byName('Denmark'))
    expect(game.found).toEqual([])
    expect(game.mistakes).toBe(1)
    expect(game.last).toMatchObject({ result: 'wrong-letter' })
  })

  it('does not count territories, as found or as mistakes, whatever their letter', () => {
    const sameLetter = pickCountry(newLetterGame('G'), byName('Greenland'))
    expect(sameLetter.found).toEqual([])
    expect(sameLetter.mistakes).toBe(0)
    expect(sameLetter.last).toMatchObject({ result: 'territory' })
    const otherLetter = pickCountry(newLetterGame('K'), byName('Greenland'))
    expect(otherLetter.mistakes).toBe(0)
    expect(otherLetter.last).toMatchObject({ result: 'territory' })
  })

  it('ignores a country found twice, without a mistake', () => {
    const once = pickCountry(newLetterGame('K'), byName('Kenya'))
    const twice = pickCountry(once, byName('Kenya'))
    expect(twice.found).toHaveLength(1)
    expect(twice.mistakes).toBe(0)
    expect(twice.last).toMatchObject({ result: 'again' })
  })

  it('finishes when every country is found', () => {
    let game = newLetterGame('Z')
    for (const country of game.targets) game = pickCountry(game, country)
    expect(game).toMatchObject({ finished: true, gaveUp: false })
  })

  it('can be given up, showing what was missed', () => {
    const game = giveUp(pickCountry(newLetterGame('K'), byName('Kenya')))
    expect(game).toMatchObject({ finished: true, gaveUp: true })
    expect(names(missing(game))).toEqual(['Kazakhstan', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan'])
  })

  it('ignores clicks once finished', () => {
    const game = giveUp(newLetterGame('K'))
    expect(pickCountry(game, byName('Kenya'))).toBe(game)
  })
})
