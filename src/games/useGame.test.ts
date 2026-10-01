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
    act(() => result.current.startLetter('S'))
    expect(result.current.game).toMatchObject({ kind: 'letter', letter: 'S', difficulty: 'hard' })
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

  it('gives up the letter hunt, saving the countries found for that letter', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.startLetter('K'))
    const game = result.current.game as LetterGameState
    act(() => result.current.pick(game.targets[0]))
    act(() => result.current.advance())
    expect(result.current.game).toMatchObject({ finished: true, gaveUp: true })
    expect(result.current.best['letter:K']).toBe(1)
  })

  it('finishes the letter hunt when everything is found, keeping the best per letter', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.startLetter('Z'))
    for (const country of (result.current.game as LetterGameState).targets) act(() => result.current.pick(country))
    expect(result.current.game?.finished).toBe(true)
    expect(result.current.best['letter:Z']).toBe(2)
    act(() => result.current.startLetter('Z'))
    expect(result.current.previousBest).toBe(2)
  })

  it('plays "name them all", saving the best per continent', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.startAll('Oceania'))
    expect(result.current.game).toMatchObject({ kind: 'all', scope: 'Oceania' })
    const fiji = countries.find((c) => c.properties.name === 'Fiji')!
    act(() => result.current.pick(fiji))
    act(() => result.current.advance())
    expect(result.current.game).toMatchObject({ finished: true, gaveUp: true })
    expect(result.current.best['all:Oceania']).toBe(1)
    act(() => result.current.startAll('Oceania'))
    expect(result.current.previousBest).toBe(1)
  })

  it('quits', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('find', 'easy'))
    act(() => result.current.quit())
    expect(result.current.game).toBeNull()
  })
})
