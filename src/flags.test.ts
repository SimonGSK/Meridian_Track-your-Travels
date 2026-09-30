import { describe, expect, it } from 'vitest'
import { countries } from './countries'
import { flagUrl } from './flags'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!

describe('flagUrl', () => {
  it("points to the country's flag", () => {
    expect(flagUrl(byName('Denmark'))).toMatch(/\/dk\.svg/)
    expect(flagUrl(byName('Japan'))).toMatch(/\/jp\.svg/)
  })

  it('has a flag for every country with an ISO code, and for Kosovo', () => {
    const missing = countries
      .filter((c) => c.properties.isoCode !== null || c.properties.name === 'Kosovo')
      .filter((c) => !flagUrl(c))
      .map((c) => c.properties.name)
    expect(missing).toEqual([])
  })

  it('returns null for places without a flag', () => {
    expect(flagUrl(byName('Somaliland'))).toBeNull()
    expect(flagUrl(byName('Northern Cyprus'))).toBeNull()
  })
})
