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

  it('puts a removed flight back where it was in the order', () => {
    const { result } = renderHook(() => useFlights(null, null))
    act(() => result.current.add('CPH', 'BKK'))
    act(() => result.current.add('BKK', 'HKT', '2024-02'))
    act(() => result.current.add('HKT', 'CPH'))
    const [, middle] = result.current.flights
    let undo = () => {}
    act(() => {
      undo = result.current.remove(middle.id)
    })
    expect(result.current.flights.map((f) => f.to)).toEqual(['BKK', 'CPH'])
    act(() => undo())
    expect(result.current.flights).toEqual([result.current.flights[0], middle, result.current.flights[2]])
    expect(result.current.flights.map((f) => f.to)).toEqual(['BKK', 'HKT', 'CPH'])
    act(() => undo()) // only once
    expect(result.current.flights).toHaveLength(3)
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

  it('keeps when a flight was, and changes or clears it', () => {
    const { result } = renderHook(() => useFlights(null, null))
    act(() => result.current.add('CPH', 'BKK', '2024-05'))
    act(() => result.current.add('BKK', 'SYD'))
    const [first, second] = result.current.flights
    expect(first).toMatchObject({ from: 'CPH', to: 'BKK', date: '2024-05' })
    expect(second).not.toHaveProperty('date')
    act(() => result.current.setDate(second.id, '2024-06'))
    act(() => result.current.setDate(first.id, null))
    expect(result.current.flights.map((f) => f.date)).toEqual([undefined, '2024-06'])
    expect(result.current.flights[0]).not.toHaveProperty('date')
  })

  it('ignores corrupted data', () => {
    localStorage.setItem(FLIGHTS_KEY, JSON.stringify([{ id: 'a', from: 'CPH', to: 'BKK', date: 'last May' }]))
    expect(renderHook(() => useFlights(null, null)).result.current.flights).toEqual([])
    localStorage.setItem(FLIGHTS_KEY, JSON.stringify([{ from: 'Paris' }]))
    expect(renderHook(() => useFlights(null, null)).result.current.flights).toEqual([])
  })
})
