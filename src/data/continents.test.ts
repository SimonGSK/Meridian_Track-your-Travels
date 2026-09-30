import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { CONTINENTS, continentOf } from './continents'

const continent = (name: string) => countries.find((c) => c.properties.name === name)!.properties.continent
const countriesIn = (c: string) =>
  countries.filter((x) => x.properties.kind === 'country' && x.properties.continent === c).length

describe('continents', () => {
  it('gives every place a continent', () => {
    for (const c of countries) expect(CONTINENTS).toContain(c.properties.continent)
  })

  it.each([
    ['Denmark', 'Europe'],
    ['Russia', 'Europe'],
    ['Türkiye', 'Asia'],
    ['Egypt', 'Africa'],
    ['Panama', 'North America'],
    ['Trinidad and Tobago', 'North America'],
    ['Greenland', 'North America'],
    ['Brazil', 'South America'],
    ['Fiji', 'Oceania'],
    ['Antarctica', 'Antarctica'],
    ['Somaliland', 'Africa'],
    ['Kosovo', 'Europe'],
  ])('puts %s in %s', (name, expected) => {
    expect(continent(name)).toBe(expected)
  })

  it('has the usual number of countries per continent', () => {
    expect(countriesIn('Africa')).toBe(54)
    expect(countriesIn('Europe')).toBe(46)
    expect(countriesIn('North America')).toBe(23)
    expect(countriesIn('South America')).toBe(12)
    expect(countriesIn('Oceania')).toBe(14)
    expect(countriesIn('Asia')).toBe(48)
    expect(countriesIn('Antarctica')).toBe(0)
  })

  it('refuses to guess for an unknown place', () => {
    expect(() => continentOf('Atlantis', null)).toThrow('No continent for Atlantis')
  })
})
