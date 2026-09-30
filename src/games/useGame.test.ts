import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { BEST_SCORES_KEY, useGame } from './useGame'
import { currentRound, type RoundGameState } from './games'
import { countries } from '../countries'
import type { LetterGameState } from './letterGame'

type Hook = { current: ReturnType<typeof useGame> }
const rounds = (result: Hook) => result.current.game as RoundGameState

function playAll(result: Hook, correct: (i: number) => boolean) {
  const count = rounds(result).rounds.length
  for (let i = 0; i < count; i++) {
    const round = currentRound(rounds(result))
    const wrong = countries.find((c) => c.properties.kind === 'country' && c !== round.target)!
    act(() => result.current.pick(correct(i) ? round.target : wrong))
    act(() => result.current.advance())
  }
}

describe('useGame', () => {
  it('starts with no game', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.game).toBeNull()
  })

  it('starts games at the chosen difficulty', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('shape', 'medium'))
    expect(result.current.game).toMatchObject({ kind: 'rounds', id: 'shape', difficulty: 'medium' })
    act(() => result.current.start('letter', 'hard'))
    expect(result.current.game).toMatchObject({ kind: 'letter', difficulty: 'hard' })
  })

  it('keeps "find the country" scores (points) apart from the old 1-per-round ones', () => {
    localStorage.setItem(BEST_SCORES_KEY, JSON.stringify({ 'find:easy': 9 }))
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('find', 'easy'))
    expect(result.current.previousBest).toBeUndefined()
  })

  it('answers, with the name typed, and advances', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('flags', 'easy'))
    const { target } = currentRound(rounds(result))
    act(() => result.current.pick(target, 'Some old name'))
    expect(rounds(result).answer).toMatchObject({ correct: true, alias: 'Some old name' })
    act(() => result.current.advance())
    expect(rounds(result)).toMatchObject({ index: 1, answer: null })
  })

  it('saves the best score per game and difficulty', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('flags', 'easy'))
    playAll(result, (i) => i < 6)
    expect(result.current.game?.finished).toBe(true)
    expect(result.current.best).toEqual({ 'flags:easy': 6 })
    expect(JSON.parse(localStorage.getItem(BEST_SCORES_KEY)!)).toEqual({ 'flags:easy': 6 })
  })

  it('keeps the higher score and remembers the previous best', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('name', 'easy'))
    playAll(result, (i) => i < 6)
    act(() => result.current.start('name', 'easy'))
    expect(result.current.previousBest).toBe(6)
    playAll(result, (i) => i < 3)
    expect(result.current.best).toEqual({ 'name:easy': 6 })
  })

  it('gives up the letter hunt, saving the share found', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('letter', 'easy'))
    const game = result.current.game as LetterGameState
    act(() => result.current.pick(game.targets[0]))
    act(() => result.current.advance())
    const after = result.current.game as LetterGameState
    expect(after).toMatchObject({ finished: true, gaveUp: true })
    expect(result.current.best['letter:easy']).toBe(Math.round((1 / after.targets.length) * 100))
  })

  it('finishes the letter hunt when everything is found, saving 100%', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('letter', 'easy'))
    for (const country of (result.current.game as LetterGameState).targets) act(() => result.current.pick(country))
    expect(result.current.game?.finished).toBe(true)
    expect(result.current.best['letter:easy']).toBe(100)
  })

  it('quits', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('find', 'easy'))
    act(() => result.current.quit())
    expect(result.current.game).toBeNull()
  })
})
