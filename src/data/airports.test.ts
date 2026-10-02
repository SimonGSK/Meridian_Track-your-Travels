import { describe, expect, it } from 'vitest'
import { cityOf, countryOf, findAirports, loadAirports, nearestAirport } from './airports'

const airports = await loadAirports()
const airport = (code: string) => airports.find((a) => a.code === code)!
const codes = (list: { code: string }[]) => list.map((a) => a.code)

describe('airports', () => {
  it('has every international airport, each with a code of its own', () => {
    expect(airports.length).toBeGreaterThan(3000)
    expect(new Set(codes(airports)).size).toBe(airports.length)
    expect(airports.every((a) => /^[A-Z]{3}$/.test(a.code))).toBe(true)
    for (const code of ['CPH', 'LHR', 'JFK', 'DXB', 'HND', 'NRT', 'SYD', 'NAN', 'VNX', 'MQP', 'GRU', 'JNB']) {
      expect(codes(airports)).toContain(code)
    }
  })

  it('finds an airport by its code first, then by city, then by its name', () => {
    expect(codes(findAirports(airports, 'cph'))[0]).toBe('CPH')
    expect(codes(findAirports(airports, 'london')).slice(0, 4).sort()).toEqual(['LCY', 'LGW', 'LHR', 'STN'])
    expect(codes(findAirports(airports, 'heathrow'))).toEqual(['LHR'])
    expect(findAirports(airports, '')).toEqual([])
  })

  it('names the city an airport serves, without the district', () => {
    expect(cityOf(airport('SYD'))).toBe('Sydney')
    expect(cityOf(airport('CPH'))).toBe('Copenhagen')
  })

  it('names its country or territory, also places the map draws as part of another', () => {
    expect(countryOf(airport('CPH'))).toBe('Denmark')
    expect(countryOf(airport('GOH'))).toBe('Greenland')
    expect(countryOf(airport('RUN'))).toBe('Reunion')
  })

  it('finds the big airport serving a place', () => {
    expect(nearestAirport(airports, { lat: 35.68, lng: 139.69 })?.code).toBe('HND') // Tokyo
    expect(nearestAirport(airports, { lat: -37.81, lng: 144.96 })?.code).toBe('MEL') // Melbourne
    expect(nearestAirport(airports, { lat: 0, lng: -140 })).toBeNull() // the middle of the Pacific
  })
})
