import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { WISHLIST_KEY, useWishlist } from './useWishlist'

describe('useWishlist', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useWishlist())
    expect([...result.current.wishlist]).toEqual([])
  })

  it('adds, removes and toggles places, and remembers them', () => {
    const first = renderHook(() => useWishlist())
    act(() => first.result.current.add('Peru'))
    act(() => first.result.current.add('Peru'))
    act(() => first.result.current.toggle('Iceland'))
    expect([...first.result.current.wishlist]).toEqual(['Peru', 'Iceland'])
    act(() => first.result.current.toggle('Peru'))
    act(() => first.result.current.remove('Japan')) // not on it: nothing changes
    expect(JSON.parse(localStorage.getItem(WISHLIST_KEY)!)).toEqual(['Iceland'])

    const second = renderHook(() => useWishlist())
    expect([...second.result.current.wishlist]).toEqual(['Iceland'])
    act(() => second.result.current.remove('Iceland'))
    expect([...second.result.current.wishlist]).toEqual([])
  })

  it('ignores damaged data', () => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify({ Peru: true }))
    const { result } = renderHook(() => useWishlist())
    expect([...result.current.wishlist]).toEqual([])
  })
})
