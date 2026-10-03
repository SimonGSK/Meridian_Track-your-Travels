import { describe, expect, it } from 'vitest'
import { countries, findCountryByName, searchCountries } from '../countries'
import { DISPLAY_NAMES, matchKey, normalizeName } from './names'

const names = countries.map((c) => c.properties.name)
const nameOf = (input: string) => findCountryByName(input)?.properties.name ?? null

describe('display names', () => {
  it('spells names out instead of the map abbreviations', () => {
    for (const name of names) {
      expect(name.replace('U.S.', 'US')).not.toMatch(/\b(Is|Rep|Ter|Herz|Barb|Gren|St|Fr|S|N|W|Eq|Dem)\.(\s|$)/)
    }
  })

  it.each([
    ['eSwatini', 'Eswatini'],
    ['Dem. Rep. Congo', 'Democratic Republic of the Congo'],
    ['Bosnia and Herz.', 'Bosnia and Herzegovina'],
    ['St. Vin. and Gren.', 'Saint Vincent and the Grenadines'],
    ['W. Sahara', 'Western Sahara'],
  ])('shows %s as %s', (mapName, name) => {
    expect(countries.find((c) => c.properties.mapName === mapName)?.properties.name).toBe(name)
  })

  it('has unique names', () => {
    expect(new Set(names).size).toBe(names.length)
  })

  it('only renames places that exist in the map', () => {
    const mapNames = new Set(countries.map((c) => c.properties.mapName))
    for (const mapName of Object.keys(DISPLAY_NAMES)) expect(mapNames).toContain(mapName)
  })
})

describe('countries and territories', () => {
  const byKind = (kind: string) => countries.filter((c) => c.properties.kind === kind).map((c) => c.properties.name)

  it('counts the 193 UN members, 2 observers, Kosovo and Taiwan as countries', () => {
    expect(byKind('country')).toHaveLength(197)
    for (const name of ['Vatican City', 'Palestine', 'Kosovo', 'Taiwan', 'Tuvalu', 'Maldives', 'Eswatini']) {
      expect(byKind('country')).toContain(name)
    }
  })

  it('calls everything else a territory', () => {
    for (const name of ['Greenland', 'Puerto Rico', 'Western Sahara', 'Antarctica', 'Siachen Glacier', 'Ashmore and Cartier Islands']) {
      expect(byKind('territory')).toContain(name)
    }
  })
})

describe('findCountryByName', () => {
  it.each([
    ['Swaziland', 'Eswatini'],
    ['eSwatini', 'Eswatini'],
    ['East Timor', 'Timor-Leste'],
    ['timor leste', 'Timor-Leste'],
    ['Burma', 'Myanmar'],
    ['Ivory Coast', "Côte d'Ivoire"],
    ["cote d'ivoire", "Côte d'Ivoire"],
    ['Czech Republic', 'Czechia'],
    ['Turkey', 'Türkiye'],
    ['USA', 'United States'],
    ['United States of America', 'United States'],
    ['UK', 'United Kingdom'],
    ['DRC', 'Democratic Republic of the Congo'],
    ['Congo', 'Republic of the Congo'],
    ['Cape Verde', 'Cabo Verde'],
    ['St Kitts & Nevis', 'Saint Kitts and Nevis'],
    ['the netherlands', 'Netherlands'],
    ['  GERMANY ', 'Germany'],
    ['U.K.', 'United Kingdom'],
    ['u.s.a', 'United States'],
    ['Guinea Bissau', 'Guinea-Bissau'],
    ['Cote dIvoire', "Côte d'Ivoire"],
    ['Cote d Ivoire', "Côte d'Ivoire"],
    ['Bosnia & Herzegovina', 'Bosnia and Herzegovina'],
    ['Ceylon', 'Sri Lanka'],
    ['Siam', 'Thailand'],
    ['Persia', 'Iran'],
    ['Abyssinia', 'Ethiopia'],
    ['Formosa', 'Taiwan'],
    ['Upper Volta', 'Burkina Faso'],
    ['Byelorussia', 'Belarus'],
    ['Viet Nam', 'Vietnam'],
    ['Western Samoa', 'Samoa'],
  ])('reads "%s" as %s', (input, expected) => {
    expect(nameOf(input)).toBe(expected)
  })

  it('does not guess from partial names', () => {
    expect(nameOf('Germ')).toBeNull()
    expect(nameOf('Guinea')).toBe('Guinea')
    expect(nameOf('Niger')).toBe('Niger')
    expect(nameOf('Dominica')).toBe('Dominica')
    expect(nameOf('Dominican Republic')).toBe('Dominican Republic')
  })

  it('never maps one spelling to two places', () => {
    const seen = new Map<string, string>()
    for (const country of countries) {
      for (const alias of country.properties.aliases) {
        const key = matchKey(alias)
        const other = seen.get(key)
        if (other && other !== country.properties.name) throw new Error(`"${alias}": ${other} and ${country.properties.name}`)
        seen.set(key, country.properties.name)
      }
    }
  })
})

describe('searchCountries', () => {
  const search = (query: string) => searchCountries(query).map((m) => m.country.properties.name)

  it('finds names starting with the text first', () => {
    expect(search('den')[0]).toBe('Denmark')
    expect(search('ger')).toContain('Germany')
  })

  it('finds words inside names', () => {
    expect(search('herz')).toContain('Bosnia and Herzegovina')
  })

  it('finds places by a former name, saying which name matched', () => {
    const [match] = searchCountries('swazi')
    expect(match.country.properties.name).toBe('Eswatini')
    expect(match.matchedAlias).toBe('Swaziland')
  })

  it('searches only among the given places', () => {
    const pool = countries.filter((c) => ['Denmark', 'Dominica'].includes(c.properties.name))
    expect(searchCountries('d', pool).map((m) => m.country.properties.name)).toEqual(['Denmark', 'Dominica'])
  })

  it('returns nothing for an empty query', () => {
    expect(searchCountries('  ')).toEqual([])
  })
})

describe('normalizeName', () => {
  it('ignores case, accents, punctuation and a leading "the"', () => {
    expect(normalizeName('The Côte-d’Ivoire')).toBe(normalizeName("cote d'ivoire"))
    expect(normalizeName('U.K.')).toBe('uk')
    expect(normalizeName('St. Lucia')).toBe('saint lucia')
    expect(normalizeName('Trinidad & Tobago')).toBe('trinidad and tobago')
  })
})
