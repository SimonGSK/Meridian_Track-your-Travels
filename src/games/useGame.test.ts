import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { BEST_SCORES_KEY, useGame } from './useGame'
import { currentRound } from './games'

function playAll(result: { current: ReturnType<typeof useGame> }, correct: (i: number) => boolean) {
  const rounds = result.current.game!.rounds.length
  for (let i = 0; i < rounds; i++) {
    const round = currentRound(result.current.game!)
    const wrong = round.options.find((o) => o !== round.target)!
    act(() => result.current.pick(correct(i) ? round.target : wrong))
    act(() => result.current.advance())
  }
}

describe('useGame', () => {
  it('starts with no game', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.game).toBeNull()
  })

  it('starts, answers and advances', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('flags'))
    const { target } = currentRound(result.current.game!)
    act(() => result.current.pick(target))
    expect(result.current.game).toMatchObject({ score: 1, answer: { correct: true } })
    act(() => result.current.advance())
    expect(result.current.game).toMatchObject({ index: 1, answer: null })
  })

  it('saves the best score when a game ends', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('flags'))
    playAll(result, (i) => i < 6)
    expect(result.current.game?.finished).toBe(true)
    expect(result.current.best).toEqual({ flags: 6 })
    expect(JSON.parse(localStorage.getItem(BEST_SCORES_KEY)!)).toEqual({ flags: 6 })
  })

  it('keeps the higher score and remembers the previous best', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('name'))
    playAll(result, (i) => i < 6)

    act(() => result.current.start('name'))
    expect(result.current.previousBest).toBe(6)
    playAll(result, (i) => i < 3)
    expect(result.current.best).toEqual({ name: 6 })
  })

  it('quits', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('find'))
    act(() => result.current.quit())
    expect(result.current.game).toBeNull()
  })
})
