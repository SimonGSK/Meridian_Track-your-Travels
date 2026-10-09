import { geoDistance } from 'd3-geo'

/**
 * Following a trip: its plane flies its flights once, briskly, so a long
 * trip takes half a minute or so, going straight on from each stop while
 * the globe turns to the next flight.
 */

type LatLng = { lat: number; lng: number }

/** How long the globe takes to turn to the first flight, before the plane sets off */
export const FOLLOW_LEAD_IN = 2

/** How long the plane waits where it lands, followed: none, it flies straight on */
export const FOLLOW_STOP = 0

/** How long a flight takes, followed: Copenhagen to Doha about 3⅓ seconds, a short hop 1½ */
export function followSeconds({ from, to }: { from: LatLng; to: LatLng }) {
  return 1.5 + geoDistance([from.lng, from.lat], [to.lng, to.lat]) * 2.5
}

/** When each flight lands, in seconds from the start: after the lead-in, the flights before, and any wait at each stop */
export function followLandings(seconds: readonly number[]) {
  let at = FOLLOW_LEAD_IN
  return seconds.map((leg) => {
    const lands = at + leg
    at = lands + FOLLOW_STOP
    return lands
  })
}
