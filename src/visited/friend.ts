import { fromBase64Url, toBase64Url } from '../base64url'
import { countries, findCountryByName, type CountryFeature } from '../countries'

/**
 * Comparing with a friend: each of you shares a link carrying your name and
 * the places you've been (nothing else: not cities, flights or dates), and
 * pastes the other's into Meridian. Opening a link at the same address
 * works too.
 */

/** A friend's atlas, as saved here */
export type Friend = { name: string; places: string[] }

export const FRIEND_KEY = 'countries-app.friend'

/** The longest name kept */
export const FRIEND_NAME_MAX = 30
const LINK_VERSION = 1

export const isFriend = (value: unknown): value is Friend =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Friend).name === 'string' &&
  Array.isArray((value as Friend).places) &&
  (value as Friend).places.every((p) => typeof p === 'string')

/** Saved as a friend, or none */
export const isFriendOrNone = (value: unknown): value is Friend | null => value === null || isFriend(value)

/** Your link: the app's address with `#compare=` and your name and places */
export function shareLink(name: string, places: Iterable<string>, base = `${window.location.origin}${window.location.pathname}`) {
  const data = { v: LINK_VERSION, name: name.trim().slice(0, FRIEND_NAME_MAX), places: [...places] }
  return `${base}#compare=${toBase64Url(JSON.stringify(data))}`
}

/**
 * A friend's atlas from their link, or from just its code: the places
 * known here, by today's names. Null when it isn't a Meridian link.
 */
export function readShared(text: string): Friend | null {
  const trimmed = text.trim()
  const code = trimmed.includes('compare=') ? trimmed.slice(trimmed.lastIndexOf('compare=') + 'compare='.length) : trimmed
  try {
    const data = JSON.parse(fromBase64Url(code.split(/[&\s]/)[0])) as { v?: unknown; name?: unknown; places?: unknown }
    if (data.v !== LINK_VERSION || !Array.isArray(data.places)) return null
    const names = data.places.flatMap((p) => (typeof p === 'string' ? (findCountryByName(p)?.properties.name ?? []) : []))
    const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, FRIEND_NAME_MAX) : 'Your friend'
    return { name, places: [...new Set(names)] }
  } catch {
    return null
  }
}

/** Takes a friend's atlas from the address (`#compare=…`), saves it and clears the address; says whether there was one */
export function takeFriendFromAddress(location: Location = window.location, storage: Storage = localStorage) {
  if (!location.hash.startsWith('#compare=')) return false
  const friend = readShared(location.hash)
  window.history.replaceState(null, '', location.pathname + location.search)
  if (!friend) return false
  try {
    storage.setItem(FRIEND_KEY, JSON.stringify(friend))
  } catch {
    // Storage blocked: nothing to compare with after all
    return false
  }
  return true
}

const byName = (a: CountryFeature, b: CountryFeature) => a.properties.name.localeCompare(b.properties.name)

/** Where you've both been, and where only one of you has, by name */
export function comparisonOf(yours: ReadonlySet<string>, friend: Friend) {
  const theirs = new Set(friend.places)
  const places = (has: (name: string) => boolean) => countries.filter((c) => has(c.properties.name)).sort(byName)
  return {
    both: places((n) => yours.has(n) && theirs.has(n)),
    onlyYou: places((n) => yours.has(n) && !theirs.has(n)),
    onlyFriend: places((n) => !yours.has(n) && theirs.has(n)),
  }
}

export type Comparison = ReturnType<typeof comparisonOf>
