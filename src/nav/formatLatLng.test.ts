import { describe, expect, it } from 'vitest'
import { formatLatLng } from './formatLatLng'

describe('formatLatLng', () => {
  it('writes latitude and longitude with N, S, E and W', () => {
    expect(formatLatLng(23.44, 58.04)).toBe('23.4°N · 58.0°E')
    expect(formatLatLng(-34.6, -58.4)).toBe('34.6°S · 58.4°W')
  })

  it('brings longitudes from a spinning globe back into range', () => {
    expect(formatLatLng(0, 370)).toBe('0.0°N · 10.0°E')
    expect(formatLatLng(0, -190)).toBe('0.0°N · 170.0°E')
  })
})
