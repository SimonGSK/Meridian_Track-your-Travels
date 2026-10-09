import { describe, expect, it } from 'vitest'
import { FOLLOW_LEAD_IN, followLandings, followSeconds } from './follow'

const copenhagen = { lat: 55.62, lng: 12.66 }
const doha = { lat: 25.27, lng: 51.61 }

describe('following a trip', () => {
  it('flies a flight briskly: Copenhagen to Doha in about 3⅓ seconds, a hop in 1½', () => {
    expect(followSeconds({ from: copenhagen, to: doha })).toBeCloseTo(3.3, 1)
    expect(followSeconds({ from: copenhagen, to: copenhagen })).toBe(1.5)
  })

  it('lands each flight after the lead-in and the flights before, going straight on from each', () => {
    expect(followLandings([5, 3, 4])).toEqual([FOLLOW_LEAD_IN + 5, FOLLOW_LEAD_IN + 8, FOLLOW_LEAD_IN + 12])
  })
})
