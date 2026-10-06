import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import PreviewExit, { PREVIEW_EXIT_SHOWN_MS } from './PreviewExit'

describe('PreviewExit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const button = () => screen.getByRole('button', { name: /^Exit preview/ })

  it('shows as the preview opens, then goes', () => {
    render(<PreviewExit onExit={vi.fn()} />)
    expect(button()).toHaveClass('shown')
    act(() => vi.advanceTimersByTime(PREVIEW_EXIT_SHOWN_MS))
    expect(button()).not.toHaveClass('shown')
  })

  it('shows on a tap, as phones have no mouse to move', () => {
    render(<PreviewExit onExit={vi.fn()} />)
    act(() => vi.advanceTimersByTime(PREVIEW_EXIT_SHOWN_MS))
    fireEvent.pointerDown(window, { pointerType: 'touch' })
    expect(button()).toHaveClass('shown')
  })

  it('shows while the mouse moves, and goes once it stops', () => {
    render(<PreviewExit onExit={vi.fn()} />)
    act(() => vi.advanceTimersByTime(PREVIEW_EXIT_SHOWN_MS))
    expect(button()).not.toHaveClass('shown')
    fireEvent.pointerMove(window)
    expect(button()).toHaveClass('shown')
    act(() => vi.advanceTimersByTime(PREVIEW_EXIT_SHOWN_MS - 100))
    fireEvent.pointerMove(window) // still moving: stays
    act(() => vi.advanceTimersByTime(PREVIEW_EXIT_SHOWN_MS - 100))
    expect(button()).toHaveClass('shown')
    act(() => vi.advanceTimersByTime(200))
    expect(button()).not.toHaveClass('shown')
  })

  it('leaves the preview when clicked, or with Escape', () => {
    const onExit = vi.fn()
    render(<PreviewExit onExit={onExit} />)
    fireEvent.pointerMove(window)
    fireEvent.click(button())
    expect(onExit).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onExit).toHaveBeenCalledTimes(2)
  })
})
