import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { FLIGHTS_KEY, useFlights } from './useFlights'
import { loadAirports } from '../data/airports'
import { loadCities } from '../data/cities'

const [airports, cities] = await Promise.all([loadAirports(), loadCities()])

describe('useFlights', () => {
  it('adds and removes flights between airports, and remembers them', () => {
    const first = renderHook(() => useFlights(null, null))
    act(() => first.result.current.add('CPH', 'BKK'))
    act(() => first.result.current.add('BKK', 'CPH'))
    expect(first.result.current.flights.map((f) => [f.from, f.to])).toEqual([['CPH', 'BKK'], ['BKK', 'CPH']])
    act(() => first.result.current.remove(first.result.current.flights[0].id))
    first.unmount()
    expect(JSON.parse(localStorage.getItem(FLIGHTS_KEY)!)).toMatchObject([{ from: 'BKK', to: 'CPH' }])
    expect(renderHook(() => useFlights(null, null)).result.current.flights).toHaveLength(1)
  })

  it('does not add a flight to the same airport', () => {
    const { result } = renderHook(() => useFlights(null, null))
    act(() => result.current.add('CPH', 'CPH'))
    expect(result.current.flights).toEqual([])
  })

  it('moves flights saved between cities to their airports, once cities and airports are there', async () => {
    const id = (name: string) => cities.find((c) => c.name === name)!.id
    localStorage.setItem(FLIGHTS_KEY, JSON.stringify([{ id: 'a', from: id('Copenhagen'), to: id('Dubai') }]))
    const { result, rerender } = renderHook(({ loaded }) => useFlights(loaded ? cities : null, loaded ? airports : null), {
      initialProps: { loaded: false },
    })
    expect(result.current.flights).toEqual([]) // not shown until moved
    rerender({ loaded: true })
    await waitFor(() => expect(result.current.flights).toEqual([{ id: 'a', from: 'CPH', to: 'DXB' }]))
    expect(JSON.parse(localStorage.getItem(FLIGHTS_KEY)!)).toEqual([{ id: 'a', from: 'CPH', to: 'DXB' }])
  })

  it('ignores corrupted data', () => {
    localStorage.setItem(FLIGHTS_KEY, JSON.stringify([{ from: 'Paris' }]))
    expect(renderHook(() => useFlights(null, null)).result.current.flights).toEqual([])
  })
})
