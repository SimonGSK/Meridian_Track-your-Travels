import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { TRIP_NAMES_KEY, TRIP_NAME_MAX, isTripNames, useTripNames } from './useTripNames'

const flights = ['a', 'b', 'c', 'd']

describe('useTripNames', () => {
  it('names a trip by its flights, and remembers it', () => {
    const first = renderHook(() => useTripNames())
    act(() => first.result.current.setName(['a', 'b'], { name: 'Interrail 2019', note: 'With Anna' }, flights))
    expect(first.result.current.nameOf(['a', 'b'])).toEqual({ name: 'Interrail 2019', note: 'With Anna' })
    first.unmount()
    expect(renderHook(() => useTripNames()).result.current.nameOf(['a', 'b'])?.name).toBe('Interrail 2019')
  })

  it('keeps the name as flights are added to the trip or removed from it', () => {
    const { result } = renderHook(() => useTripNames())
    act(() => result.current.setName(['a', 'b'], { name: 'Japan' }, flights))
    expect(result.current.nameOf(['a', 'b', 'c'])?.name).toBe('Japan') // a flight added
    expect(result.current.nameOf(['b'])?.name).toBe('Japan') // the first removed
    expect(result.current.nameOf(['c', 'd'])).toBeNull()
  })

  it('renames, and forgets a name cleared, and those of flights no longer there', () => {
    const { result } = renderHook(() => useTripNames())
    act(() => result.current.setName(['a', 'b'], { name: 'Japan' }, flights))
    act(() => result.current.setName(['c', 'd'], { name: 'Peru' }, flights))
    act(() => result.current.setName(['a', 'b'], { name: 'Japan and Korea' }, flights))
    expect(result.current.nameOf(['a', 'b'])).toEqual({ name: 'Japan and Korea' })
    act(() => result.current.setName(['c', 'd'], { name: ' ', note: '' }, ['a', 'b', 'c', 'd']))
    expect(result.current.nameOf(['c', 'd'])).toBeNull()
    act(() => result.current.setName(['c'], { name: 'Lima' }, ['b', 'c'])) // a gone
    expect(JSON.parse(localStorage.getItem(TRIP_NAMES_KEY)!)).toEqual({ b: { name: 'Japan and Korea' }, c: { name: 'Lima' } })
  })

  it('keeps a note without a name, and cuts both to length', () => {
    const { result } = renderHook(() => useTripNames())
    act(() => result.current.setName(['a'], { name: '', note: 'Rained all week' }, flights))
    expect(result.current.nameOf(['a'])).toEqual({ name: '', note: 'Rained all week' })
    act(() => result.current.setName(['a'], { name: 'x'.repeat(100) }, flights))
    expect(result.current.nameOf(['a'])?.name).toHaveLength(TRIP_NAME_MAX)
  })

  it('checks what it reads', () => {
    expect(isTripNames({ a: { name: 'Japan' }, b: { name: '', note: 'x' } })).toBe(true)
    expect(isTripNames({ a: { name: 3 } })).toBe(false)
    expect(isTripNames({ a: { name: 'x', note: 3 } })).toBe(false)
    expect(isTripNames(['x'])).toBe(false)
  })
})
