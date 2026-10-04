import { describe, expect, it } from 'vitest'
import { capitalOf, countryOfCapital } from './capitals'
import { countries } from '../countries'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const countryOf = (capital: string) => countryOfCapital(capital)?.properties.name ?? null

describe('capitals', () => {
  it('has one for every country but those whose capital is disputed', () => {
    const missing = countries.filter((c) => c.properties.kind === 'country' && !capitalOf(c)).map((c) => c.properties.name)
    expect(missing).toEqual(expect.arrayContaining(['Israel', 'Palestine']))
    expect(missing).toHaveLength(2)
    expect(capitalOf(byName('Greenland'))).toBeNull() // a territory
  })

  it('uses the names and spellings in use today', () => {
    expect(capitalOf(byName('Ukraine'))).toBe('Kyiv')
    expect(capitalOf(byName('Palau'))).toBe('Ngerulmud')
    expect(capitalOf(byName('Colombia'))).toBe('Bogotá')
    expect(capitalOf(byName('United States'))).toBe('Washington, D.C.')
  })

  it('finds a country from its capital, whatever the accents, punctuation and spaces', () => {
    expect(countryOf('bogota')).toBe('Colombia')
    expect(countryOf('Port of Spain')).toBe('Trinidad and Tobago')
    expect(countryOf("St. George's")).toBe('Grenada')
    expect(countryOf('ndjamena')).toBe('Chad')
    expect(countryOf('Sanaa')).toBe('Yemen')
    expect(countryOf('Paris')).toBe('France')
    expect(countryOf('Sydney')).toBeNull()
  })

  it('takes older names, and every capital of countries with several', () => {
    expect(countryOf('Kiev')).toBe('Ukraine')
    expect(countryOf('Washington')).toBe('United States')
    for (const capital of ['Pretoria', 'Cape Town', 'Bloemfontein']) expect(countryOf(capital)).toBe('South Africa')
    expect(countryOf('Sucre')).toBe('Bolivia')
    expect(countryOf('Sri Jayawardenepura Kotte')).toBe('Sri Lanka')
  })
})
