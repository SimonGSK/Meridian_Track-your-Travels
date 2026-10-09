import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PLANS_KEY, isPlans, usePlans } from './usePlans'

describe('usePlans', () => {
  it('plans a visit, changes it, gives it up, and remembers', () => {
    const first = renderHook(() => usePlans())
    act(() => first.result.current.setPlan('Japan', '2026-11-12'))
    act(() => first.result.current.setPlan('Peru', '2027-03-01'))
    act(() => first.result.current.setPlan('Japan', '2026-12-01'))
    act(() => first.result.current.setPlan('Peru', null))
    expect(first.result.current.plans).toEqual({ Japan: '2026-12-01' })
    first.unmount()
    expect(JSON.parse(localStorage.getItem(PLANS_KEY)!)).toEqual({ Japan: '2026-12-01' })
    expect(renderHook(() => usePlans()).result.current.plans).toEqual({ Japan: '2026-12-01' })
  })

  it('checks what it reads', () => {
    expect(isPlans({ Japan: '2026-11-12' })).toBe(true)
    expect(isPlans({ Japan: '2026-11' })).toBe(false)
    expect(isPlans(['Japan'])).toBe(false)
  })
})
