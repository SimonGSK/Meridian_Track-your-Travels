const DEG = Math.PI / 180

const wrap = (degrees: number) => ((degrees % 360) + 360) % 360

/**
 * Where the sun is straight overhead at a moment: its declination as the
 * latitude, and where it's noon as the longitude. The Astronomical
 * Almanac's low-precision formulas, good to about 0.01° for decades around
 * 2000, far finer than the globe shows.
 */
export function subsolarPoint(date: Date): { lat: number; lng: number } {
  // Days since noon on 1 January 2000 (J2000)
  const n = date.getTime() / 86_400_000 - 10_957.5
  const meanLongitude = wrap(280.46 + 0.9856474 * n)
  const meanAnomaly = wrap(357.528 + 0.9856003 * n) * DEG
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG
  const obliquity = (23.439 - 0.0000004 * n) * DEG

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  // Greenwich mean sidereal time: how far the Earth has turned under the stars
  const siderealTime = wrap(280.46061837 + 360.98564736629 * n)
  const lng = wrap(rightAscension / DEG - siderealTime + 180) - 180
  return { lat: declination / DEG, lng }
}
