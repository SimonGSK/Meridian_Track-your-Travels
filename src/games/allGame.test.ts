import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { SCOPES, countriesIn, formatDuration, giveUpAll, missingAll, nameCountry, newAllGame, scopeLabel } from './allGame'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const names = (list: { properties: { name: string } }[]) => list.map((c) => c.properties.name)

describe('scopes', () => {
  it('offers the whole world and each continent with countries', () => {
    expect(SCOPES).toEqual(['world', 'Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'])
    expect(countriesIn('world')).toHaveLength(197)
    expect(countriesIn('Oceania')).toHaveLength(14)
    expect(scopeLabel('world')).toBe('The whole world')
    expect(scopeLabel('Europe')).toBe('Europe')
  })
})

describe('naming countries', () => {
  it('counts a country, in the order named', () => {
    const game = nameCountry(nameCountry(newAllGame('world'), byName('Kenya')), byName('Peru'))
    expect(names(game.found)).toEqual(['Kenya', 'Peru'])
    expect(game.last).toMatchObject({ result: 'found', alias: null })
  })

  it('remembers an old name used', () => {
    const game = nameCountry(newAllGame('world'), byName('Eswatini'), 'Swaziland')
    expect(game.last).toMatchObject({ result: 'found', alias: 'Swaziland' })
  })

  it("doesn't count repeats, territories or countries outside the continent, without penalty", () => {
    let game = nameCountry(newAllGame('Europe'), byName('France'))
    game = nameCountry(game, byName('France'))
    expect(game.last?.result).toBe('again')
    game = nameCountry(game, byName('Faroe Islands'))
    expect(game.last?.result).toBe('territory')
    game = nameCountry(game, byName('Japan'))
    expect(game.last?.result).toBe('elsewhere')
    expect(names(game.found)).toEqual(['France'])
  })

  it('finishes when every country is named, stopping the clock', () => {
    let game = newAllGame('South America', 1000)
    for (const country of game.targets) game = nameCountry(game, country, null, 61_000)
    expect(game).toMatchObject({ finished: true, gaveUp: false, endedAt: 61_000 })
    expect(formatDuration(game.endedAt! - game.startedAt)).toBe('1:00')
  })

  it('can be given up, showing what was missed alphabetically', () => {
    const game = giveUpAll(nameCountry(newAllGame('South America'), byName('Peru')), 5000)
    expect(game).toMatchObject({ finished: true, gaveUp: true, endedAt: 5000 })
    expect(names(missingAll(game))).toHaveLength(11)
    expect(names(missingAll(game))[0]).toBe('Argentina')
    expect(names(missingAll(game))).not.toContain('Peru')
  })

  it('ignores names once finished', () => {
    const game = giveUpAll(newAllGame('world'))
    expect(nameCountry(game, byName('Peru'))).toBe(game)
    expect(giveUpAll(game)).toBe(game)
  })
})

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(9_500)).toBe('0:09')
    expect(formatDuration(754_000)).toBe('12:34')
  })
})
