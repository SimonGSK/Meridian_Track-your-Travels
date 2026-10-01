import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { citiesLabel, citiesOf, countryOfCity, loadCities } from './cities'
import { factsOf } from './facts'

const cities = await loadCities()
const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const names = (country: string) => citiesOf(cities, byName(country)).map((c) => c.name)

describe('cities', () => {
  it('puts every city in a country on the map', () => {
    expect(cities.filter((c) => !countryOfCity(c)).map((c) => `${c.name} (${c.place})`)).toEqual([])
  })

  it('gives cities unique ids', () => {
    expect(new Set(cities.map((c) => c.id)).size).toBe(cities.length)
  })

  it('has cities for nearly every inhabited place', () => {
    const without = countries.filter((c) => citiesOf(cities, c).length === 0 && factsOf(c)?.population !== 0)
    expect(without.map((c) => c.properties.name)).toEqual([])
  })

  it('marks one capital per place at most, matching its facts', () => {
    const capitals = cities.filter((c) => c.capital)
    expect(new Set(capitals.map((c) => c.place)).size).toBe(capitals.length)
    expect(citiesOf(cities, byName('Denmark'))[0]).toMatchObject({ name: 'Copenhagen', capital: true })
    expect(citiesOf(cities, byName('Ukraine'))[0]).toMatchObject({ name: 'Kyiv', capital: true })
    expect(citiesOf(cities, byName('United States'))[0]).toMatchObject({ name: 'Washington, D.C.', capital: true })
  })

  it('lists the capital first, then the biggest', () => {
    const india = citiesOf(cities, byName('India'))
    expect(india.slice(0, 3).map((c) => c.name)).toEqual(['New Delhi', 'Mumbai', 'Delhi'])
    const rest = india.slice(1).map((c) => c.population)
    expect(rest).toEqual([...rest].sort((a, b) => b - a))
  })

  it('has the big cities and some well-known smaller ones', () => {
    expect(names('Italy')).toEqual(expect.arrayContaining(['Rome', 'Milan', 'Venice', 'Pisa']))
    expect(names('United States')).toEqual(expect.arrayContaining(['New York City', 'Las Vegas', 'Key West']))
    expect(names('Netherlands')).toContain('The Hague')
  })

  it('uses English names', () => {
    expect(names('Denmark')).toContain('Aarhus')
    expect(names('Germany')).toEqual(expect.arrayContaining(['Cologne', 'Munich', 'Nuremberg']))
    expect(names('Switzerland')).toEqual(expect.arrayContaining(['Geneva', 'Zurich']))
    expect(cities.filter((c) => !/[a-z]/i.test(c.name))).toEqual([])
  })

  it('leaves out districts of cities already listed', () => {
    expect(names('United States')).not.toContain('Brooklyn')
    expect(names('Italy')).not.toContain('Mestre')
  })

  it('files overseas regions under the country the map draws them in', () => {
    expect(names('France')).toContain('Saint-Denis') // on Réunion
    expect(citiesOf(cities, byName('France')).filter((c) => c.capital).map((c) => c.name)).toEqual(['Paris'])
  })

  it('splits places that share a code by where they are', () => {
    expect(names('Somaliland')).toContain('Hargeisa')
    expect(names('Somalia')).not.toContain('Hargeisa')
    expect(names('Cyprus')).toContain('Nicosia')
    expect(names('Northern Cyprus')).toContain('Kyrenia')
  })

  it('counts cities in words', () => {
    expect(citiesLabel(1)).toBe('1 city')
    expect(citiesLabel(4)).toBe('4 cities')
  })
})
