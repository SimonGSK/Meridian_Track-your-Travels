import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AchievementToast, { TOAST_MS } from './AchievementToast'
import { ACHIEVEMENTS } from './achievements'

const achievement = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!

function setup(ids: string[]) {
  const props = { achievements: ids.map(achievement), onOpen: vi.fn(), onDismiss: vi.fn() }
  render(<AchievementToast {...props} />)
  return props
}

describe('AchievementToast', () => {
  afterEach(() => vi.useRealTimers())

  it('shows nothing until one is earned', () => {
    const { container } = render(<AchievementToast achievements={[]} onOpen={vi.fn()} onDismiss={vi.fn()} />)
    expect(container).toHaveTextContent('')
  })

  it('names the achievement just earned', () => {
    setup(['scandinavia'])
    expect(screen.getByRole('button', { name: /^Achievement unlocked/ })).toHaveTextContent(
      'Achievement unlockedScandinaviaDenmark, Norway and Sweden',
    )
  })

  it('counts the others earned at the same time', () => {
    setup(['scandinavia', 'countries-1'])
    expect(screen.getByText('Scandinavia and 1 more')).toBeInTheDocument()
  })

  it('opens the achievements, or is dismissed', async () => {
    const { onOpen, onDismiss } = setup(['scandinavia'])
    await userEvent.click(screen.getByRole('button', { name: /^Achievement unlocked/ }))
    expect(onOpen).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('goes by itself after a few seconds', () => {
    vi.useFakeTimers()
    const { onDismiss } = setup(['scandinavia'])
    act(() => vi.advanceTimersByTime(TOAST_MS - 1))
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('is read out politely when it appears', () => {
    setup(['scandinavia'])
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Scandinavia')
  })
})
