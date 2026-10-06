import { afterEach, describe, expect, it } from 'vitest'
import { toBase64Url } from '../base64url'
import { FRIEND_KEY, comparisonOf, isFriendOrNone, readShared, shareLink, takeFriendFromAddress } from './friend'

const names = (list: { properties: { name: string } }[]) => list.map((c) => c.properties.name)

describe('links', () => {
  it('carries your name and places, and reads back from the whole link or its code', () => {
    const link = shareLink('  Anna  ', ['Japan', 'Peru'], 'https://meridian.test/')
    expect(link).toMatch(/^https:\/\/meridian\.test\/#compare=[\w-]+$/)
    expect(readShared(link)).toEqual({ name: 'Anna', places: ['Japan', 'Peru'] })
    expect(readShared(link.split('#compare=')[1])).toEqual({ name: 'Anna', places: ['Japan', 'Peru'] })
    expect(readShared(`Look! ${link}  `)).toEqual({ name: 'Anna', places: ['Japan', 'Peru'] })
  })

  it("reads older names as today's, drops unknown places and repeats, and names a friend without one", () => {
    const code = toBase64Url(JSON.stringify({ v: 1, name: '', places: ['Swaziland', 'Atlantis', 'Eswatini', 7] }))
    expect(readShared(code)).toEqual({ name: 'Your friend', places: ['Eswatini'] })
  })

  it("isn't fooled by anything else", () => {
    expect(readShared('https://example.com/')).toBeNull()
    expect(readShared('')).toBeNull()
    expect(readShared(toBase64Url(JSON.stringify({ v: 2, name: 'Anna', places: [] })))).toBeNull()
    expect(readShared(toBase64Url('"just text"'))).toBeNull()
  })

  it('keeps names short', () => {
    expect(readShared(shareLink('x'.repeat(50), [], 'https://m.test/'))!.name).toHaveLength(30)
  })
})

describe('takeFriendFromAddress', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('saves the friend from #compare=… and clears the address', () => {
    const link = shareLink('Anna', ['Japan'], '')
    window.history.replaceState(null, '', `/?x=1${link}`)
    expect(takeFriendFromAddress()).toBe(true)
    expect(JSON.parse(localStorage.getItem(FRIEND_KEY)!)).toEqual({ name: 'Anna', places: ['Japan'] })
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?x=1')
  })

  it('does nothing without one, and clears a broken one', () => {
    expect(takeFriendFromAddress()).toBe(false)
    window.history.replaceState(null, '', '/#compare=nonsense')
    expect(takeFriendFromAddress()).toBe(false)
    expect(window.location.hash).toBe('')
    expect(localStorage.getItem(FRIEND_KEY)).toBeNull()
  })
})

describe('comparisonOf', () => {
  it('splits the places into both, only you and only your friend, by name', () => {
    const result = comparisonOf(new Set(['Japan', 'France', 'Denmark']), { name: 'Anna', places: ['Peru', 'Japan', 'Chile', 'Denmark'] })
    expect(names(result.both)).toEqual(['Denmark', 'Japan'])
    expect(names(result.onlyYou)).toEqual(['France'])
    expect(names(result.onlyFriend)).toEqual(['Chile', 'Peru'])
  })
})

describe('isFriendOrNone', () => {
  it('checks what was saved', () => {
    expect(isFriendOrNone(null)).toBe(true)
    expect(isFriendOrNone({ name: 'Anna', places: ['Japan'] })).toBe(true)
    expect(isFriendOrNone({ name: 'Anna', places: [1] })).toBe(false)
    expect(isFriendOrNone({ places: [] })).toBe(false)
  })
})
