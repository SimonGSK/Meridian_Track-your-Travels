import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { FLIGHTS_KEY, useFlights } from './useFlights'

describe('useFlights', () => {
  it('adds and removes flights, and remembers them', () => {
    const first = renderHook(() => useFlights())
    act(() => first.result.current.add(1, 2))
    act(() => first.result.current.add(2, 1))
    expect(first.result.current.flights.map((f) => [f.from, f.to])).toEqual([[1, 2], [2, 1]])
    act(() => first.result.current.remove(first.result.current.flights[0].id))
    first.unmount()
    expect(JSON.parse(localStorage.getItem(FLIGHTS_KEY)!)).toMatchObject([{ from: 2, to: 1 }])
    expect(renderHook(() => useFlights()).result.current.flights).toHaveLength(1)
  })

  it('does not add a flight to the same city', () => {
    const { result } = renderHook(() => useFlights())
    act(() => result.current.add(1, 1))
    expect(result.current.flights).toEqual([])
  })

  it('ignores corrupted data', () => {
    localStorage.setItem(FLIGHTS_KEY, JSON.stringify([{ from: 'Paris' }]))
    expect(renderHook(() => useFlights()).result.current.flights).toEqual([])
  })
})
