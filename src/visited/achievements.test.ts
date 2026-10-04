import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, GROUPS, REGIONS, earnedIds, progressOf, type Atlas } from './achievements'
import { countries } from '../countries'
import { countriesIn } from '../games/allGame'

const atlas = (changes: Partial<Atlas> = {}): Atlas => ({
  visited: new Set(),
  regions: new Set(),
  cities: [],
  flights: [],
  visitsTo: () => 0,
  ...changes,
})
const achievement = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!
const progress = (id: string, of: Partial<Atlas>) => progressOf(achievement(id), atlas(of))
const countryNames = countries.filter((c) => c.properties.kind === 'country').map((c) => c.properties.name)

describe('achievements', () => {
  it('each have their own id, in a known group', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    for (const a of ACHIEVEMENTS) expect(GROUPS).toContain(a.group)
    expect(ACHIEVEMENTS.length).toBeGreaterThan(45)
  })

  it('only name countries that exist, by the names used today', () => {
    for (const { names } of REGIONS) for (const name of names) expect(countryNames).toContain(name)
  })

  it('count the countries visited, not the territories', () => {
    expect(progress('countries-10', { visited: new Set(['Greenland', 'Denmark']) })).toEqual({ have: 1, need: 10, done: false })
    expect(progress('countries-1', { visited: new Set(['Denmark']) }).done).toBe(true)
  })

  it('are earned for Scandinavia with Denmark, Norway and Sweden, the Nordics also needing Finland and Iceland', () => {
    const visited = new Set(['Denmark', 'Norway', 'Sweden'])
    expect(progress('scandinavia', { visited })).toEqual({ have: 3, need: 3, done: true })
    expect(progress('nordics', { visited })).toEqual({ have: 3, need: 5, done: false })
  })

  it('count every continent with countries, Antarctica apart', () => {
    const visited = new Set(['Denmark', 'Kenya', 'Japan', 'Peru', 'Canada'])
    expect(progress('every-continent', { visited })).toEqual({ have: 5, need: 6, done: false })
    visited.add('Fiji')
    expect(progress('every-continent', { visited }).done).toBe(true)
    expect(progress('antarctica', { visited: new Set(['Antarctica']) }).done).toBe(true)
  })

  it('are earned for every country of a continent', () => {
    const europe = countriesIn('Europe').map((c) => c.properties.name)
    expect(progress('all-europe', { visited: new Set(europe.slice(1)) })).toEqual({ have: europe.length - 1, need: europe.length, done: false })
    expect(progress('all-europe', { visited: new Set(europe) }).done).toBe(true)
    expect(achievement('all-south-america').need).toBe(12)
  })

  it('count the hemispheres', () => {
    expect(progress('hemispheres', { visited: new Set(['Denmark']) }).have).toBe(2) // north and east
    expect(progress('hemispheres', { visited: new Set(['Denmark', 'Chile']) }).done).toBe(true)
  })

  it('count states, provinces, cities, capitals, flights and return trips', () => {
    expect(progress('us-states', { regions: new Set(['US-CA', 'US-NY', 'CA-QC']) })).toEqual({ have: 2, need: 51, done: false })
    expect(achievement('canada').need).toBe(13)
    expect(progress('capitals-10', { cities: [{ capital: true }, {}, { capital: true }] }).have).toBe(2)
    expect(progress('long-haul', { flights: [{ km: 9_000 }, { km: 10_400 }] }).done).toBe(true)
    expect(progress('around-the-world', { flights: [{ km: 20_000 }, { km: 21_000 }] }).done).toBe(true)
    expect(achievement('around-the-world').format!(12_345.6)).toBe('12,346 km')
    const visitsTo = (name: string) => (name === 'Spain' ? 4 : 1)
    expect(progress('visits-3', { visited: new Set(['Spain', 'Italy']), visitsTo }).done).toBe(true)
    expect(progress('visits-5', { visited: new Set(['Spain']), visitsTo }).have).toBe(4)
  })

  it('never count past what they need', () => {
    expect(progress('flights-1', { flights: [{ km: 1 }, { km: 2 }, { km: 3 }] })).toEqual({ have: 1, need: 1, done: true })
  })

  it('list the ones earned', () => {
    expect([...earnedIds(atlas({ visited: new Set(['Denmark', 'Norway', 'Sweden']) }))]).toEqual(['countries-1', 'scandinavia'])
  })
})
