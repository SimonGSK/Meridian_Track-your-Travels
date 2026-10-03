import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { factsOf, formatArea, formatAreaShort, formatPopulation, formatPopulationShort } from './facts'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!

describe('factsOf', () => {
  it('has a capital, population and area for every country', () => {
    const missing = countries
      .filter((c) => c.properties.kind === 'country')
      .filter((c) => {
        const facts = factsOf(c)
        return !facts?.capital || !facts.population || !facts.areaKm2
      })
      .map((c) => c.properties.name)
    expect(missing).toEqual([])
  })

  it('has facts for every place, territories included', () => {
    expect(countries.filter((c) => !factsOf(c)).map((c) => c.properties.name)).toEqual([])
  })

  it('uses World Bank figures', () => {
    expect(factsOf(byName('Denmark'))).toMatchObject({ capital: 'Copenhagen', areaKm2: 42920, source: 'World Bank' })
    expect(factsOf(byName('Denmark'))!.population).toBeGreaterThan(5_500_000)
    expect(factsOf(byName('Myanmar'))!.capital).toBe('Naypyidaw')
  })

  it('fills in places the World Bank leaves out, marked as estimates', () => {
    expect(factsOf(byName('Taiwan'))).toMatchObject({ capital: 'Taipei', source: 'Estimate' })
    expect(factsOf(byName('Vatican City'))!.areaKm2).toBeLessThan(1)
  })

  it("does not give a territory its country's figures when they share a code", () => {
    expect(factsOf(byName('Ashmore and Cartier Islands'))).toMatchObject({ population: 0, note: 'Uninhabited' })
  })

  it('notes the places shown as part of a country', () => {
    expect(factsOf(byName('Somalia'))!.note).toMatch(/^Includes Somaliland, .* since 1991/)
    expect(factsOf(byName('Cyprus'))!.note).toMatch(/^Includes Northern Cyprus/)
  })
})

describe('formatPopulation', () => {
  it('rounds big numbers to millions and billions', () => {
    expect(formatPopulation(1_450_935_791)).toBe('1.45 billion')
    expect(formatPopulation(5_976_992)).toBe('5.98 million')
    expect(formatPopulation(103_267)).toBe('103,267')
    expect(formatPopulation(764)).toBe('764')
  })
})

describe('formatArea', () => {
  it('shows small areas with decimals', () => {
    expect(formatArea(42_920)).toBe('42,920 km²')
    expect(formatArea(2.5)).toBe('2.5 km²')
    expect(formatArea(0.49)).toBe('0.49 km²')
  })
})

describe('short formats', () => {
  it('shortens populations to three digits', () => {
    expect(formatPopulationShort(45_696_159)).toBe('45.7M')
    expect(formatPopulationShort(1_450_935_791)).toBe('1.45B')
    expect(formatPopulationShort(103_267)).toBe('103K')
    expect(formatPopulationShort(764)).toBe('764')
  })

  it('shortens only areas of a million km² or more', () => {
    expect(formatAreaShort(2_780_400)).toBe('2.78M km²')
    expect(formatAreaShort(42_920)).toBe('42,920 km²')
    expect(formatAreaShort(0.49)).toBe('0.49 km²')
  })
})
