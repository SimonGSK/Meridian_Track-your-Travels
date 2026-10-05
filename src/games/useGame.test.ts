import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { BEST_SCORES_KEY, useGame } from './useGame'
import { BEST_TIMES_KEY } from './records'
import { currentRound, type RoundGameState } from './games'
import { countries } from '../countries'
import type { LetterGameState } from './letterGame'
import { isMore, type HigherLowerState } from './higherLower'
import { currentCity, type CityGameState } from './cityGame'

type Hook = { current: ReturnType<typeof useGame> }
const rounds = (result: Hook) => result.current.game as RoundGameState

function playAll(result: Hook, correct: (i: number) => boolean, secondsPerRound = 0) {
  const count = rounds(result).rounds.length
  for (let i = 0; i < count; i++) {
    const round = currentRound(rounds(result))
    const wrong = countries.find((c) => c.properties.kind === 'country' && c !== round.target)!
    if (secondsPerRound) vi.setSystemTime(Date.now() + secondsPerRound * 1000)
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

  it('stops an "all countries" game early, saving the score so far', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('flags', 'all'))
    expect(rounds(result).rounds).toHaveLength(197)
    act(() => result.current.pick(currentRound(rounds(result)).target))
    act(() => result.current.advance())
    act(() => result.current.stop())
    expect(rounds(result)).toMatchObject({ finished: true, stoppedEarly: true, score: 1 })
    expect(result.current.best['flags:all']).toBe(1)
  })

  describe('time records', () => {
    afterEach(() => vi.useRealTimers())
    const playFlags = (result: Hook, correct: (i: number) => boolean, secondsPerRound: number) => {
      act(() => result.current.start('flags', 'easy'))
      playAll(result, correct, secondsPerRound)
    }

    it('saves the time of a perfect run, from the start to the last answer', () => {
      vi.useFakeTimers({ toFake: ['Date'], now: 0 })
      const { result } = renderHook(() => useGame())
      playFlags(result, () => true, 4.2)
      // Looking at the results doesn't add to it
      vi.setSystemTime(Date.now() + 60_000)
      expect(result.current.bestTimes).toEqual({ 'flags:easy': 42_000 })
      expect(JSON.parse(localStorage.getItem(BEST_TIMES_KEY)!)).toEqual({ 'flags:easy': 42_000 })
    })

    it('counts no run with a mistake, however fast', () => {
      vi.useFakeTimers({ toFake: ['Date'], now: 0 })
      const { result } = renderHook(() => useGame())
      playFlags(result, (i) => i !== 3, 1)
      expect(result.current.bestTimes).toEqual({})
    })

    it('keeps the faster time, and remembers the record to beat', () => {
      vi.useFakeTimers({ toFake: ['Date'], now: 0 })
      const { result } = renderHook(() => useGame())
      playFlags(result, () => true, 3)
      playFlags(result, () => true, 5)
      expect(result.current.previousTime).toBe(30_000)
      expect(result.current.bestTimes['flags:easy']).toBe(30_000)
      playFlags(result, () => true, 2)
      expect(result.current.bestTimes['flags:easy']).toBe(20_000)
    })

    it('times the letter hunt when every country is found without a wrong letter', () => {
      vi.useFakeTimers({ toFake: ['Date'], now: 0 })
      const { result } = renderHook(() => useGame())
      act(() => result.current.startLetter('Z'))
      for (const country of (result.current.game as LetterGameState).targets) {
        vi.setSystemTime(Date.now() + 5_000)
        act(() => result.current.pick(country))
      }
      expect(result.current.bestTimes).toEqual({ 'letter:Z': 10_000 })
    })
  })

  describe('higher or lower', () => {
    const higher = (result: Hook) => result.current.game as HigherLowerState

    it('counts right guesses in a row, saving the longest streak per measure when one is wrong', () => {
      const { result } = renderHook(() => useGame())
      act(() => result.current.startHigher('area'))
      for (let i = 0; i < 3; i++) {
        act(() => result.current.guessHigher(isMore(higher(result)) ? 'more' : 'fewer'))
        act(() => result.current.advance())
      }
      expect(higher(result)).toMatchObject({ streak: 3, finished: false })
      act(() => result.current.guessHigher(isMore(higher(result)) ? 'fewer' : 'more'))
      expect(higher(result)).toMatchObject({ streak: 3, finished: true })
      expect(result.current.best).toEqual({ 'higher:area': 3 })
      expect(result.current.bestTimes).toEqual({}) // a streak, not a time
      act(() => result.current.startHigher('area'))
      expect(result.current.previousBest).toBe(3)
    })

    it('ignores guesses in other games', () => {
      const { result } = renderHook(() => useGame())
      act(() => result.current.start('flags', 'easy'))
      act(() => result.current.guessHigher('more'))
      expect(rounds(result).answer).toBeNull()
    })
  })

  describe('daily challenge', () => {
    afterEach(() => vi.useRealTimers())

    it("plays today's challenge once, keeping how it went by day, not as a best score or time", () => {
      vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 5, 9) })
      const { result } = renderHook(() => useGame())
      act(() => result.current.startDaily())
      expect(rounds(result)).toMatchObject({ id: 'daily', index: 0 })
      expect(rounds(result).rounds.map((r) => r.kind)).toEqual(['find', 'flags', 'capital', 'shape', 'name'])
      playAll(result, (i) => i !== 1)
      expect(result.current.daily).toEqual({ '2026-10-05': { score: 6, max: 7, squares: '🟩🟥🟩🟩🟩' } })
      expect(result.current.best).toEqual({})
      expect(result.current.bestTimes).toEqual({})

      act(() => result.current.quit())
      act(() => result.current.startDaily())
      expect(result.current.game).toBeNull() // played today
      vi.setSystemTime(new Date(2026, 9, 6, 9))
      act(() => result.current.startDaily())
      expect(rounds(result).id).toBe('daily')
    })
  })

  it('quits', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.start('find', 'easy'))
    act(() => result.current.quit())
    expect(result.current.game).toBeNull()
  })

  it('plays "find the city": starts once the cities are in, scores clicks, and keeps the best per level', async () => {
    const { result } = renderHook(() => useGame())
    await act(() => result.current.startCity('easy'))
    const city = () => currentCity(result.current.game as CityGameState).city
    expect(result.current.game).toMatchObject({ kind: 'city', level: 'easy', index: 0 })

    act(() => result.current.guessAt({ lat: city().lat, lng: city().lng }))
    expect((result.current.game as CityGameState).score).toBe(100)
    act(() => result.current.advance())
    for (let i = 1; i < 10; i++) {
      act(() => result.current.giveUpRound())
      act(() => result.current.advance())
    }
    expect(result.current.game?.finished).toBe(true)
    expect(result.current.best['city:easy']).toBe(100)
  }, 20_000)
})
