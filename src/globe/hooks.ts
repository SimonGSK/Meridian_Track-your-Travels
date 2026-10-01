import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { PerspectiveCamera } from 'three'
import { geoDistance } from 'd3-geo'
import { borders, countries, findCountryNear, type CountryFeature } from '../countries'
import { loadCities, type City } from '../data/cities'
import { loadRegions, type RegionFeature } from '../data/regions'
import { createCountryLayer, createRaisedCountry, type CountryLayer } from './countryLayer'
import { createPinLayer, type Pin, type PinLayer } from './pinLayer'
import { createRegionLayer, type RegionLayer } from './regionLayer'
import { approach, isClick, type LatLng, type Point } from './interaction'
import { screenToLatLng } from './picking'
import { LAND_ALTITUDE, SELECTED_ALTITUDE } from './style'
import type { Theme } from './themes'

/** How close (in pixels) the pointer must be to a tiny country's marker, or to any country's coast */
const MARKER_HIT_PX = 8
const NEAR_MISS_PX = 6

const NOTHING_EMPHASIZED: ReadonlyMap<CountryFeature, string> = new Map()

export const SPIN_SPEED = 0.4
/** How long the globe must be left alone before it starts spinning again */
export const IDLE_DELAY_MS = 30_000
/** Fraction of the remaining speed difference covered each frame */
const SPIN_EASING = 0.04

/**
 * Adds the merged country mesh to the globe's scene and keeps every country
 * painted in `colorOf(country)`, repainting only the ones that changed.
 */
export function useCountryLayer(
  globe: GlobeMethods | null,
  theme: Theme,
  colorOf: (country: CountryFeature) => string,
  {
    showMarkers = true,
    emphasized = NOTHING_EMPHASIZED,
  }: { showMarkers?: boolean; emphasized?: ReadonlyMap<CountryFeature, string> } = {},
) {
  const layer = useRef<CountryLayer | null>(null)
  const painted = useRef(new Map<CountryFeature, string>())

  useEffect(() => {
    if (!globe) return
    const scene = globe.scene()
    const created = createCountryLayer(countries, borders, globe.getGlobeRadius())
    scene.add(created.object)
    layer.current = created
    painted.current = new Map()
    return () => {
      scene.remove(created.object)
      created.dispose()
      layer.current = null
    }
  }, [globe])

  useEffect(() => {
    layer.current?.setBorders(theme.border, theme.borderOpacity)
  }, [globe, theme])

  useEffect(() => {
    layer.current?.setMarkersVisible(showMarkers)
  }, [globe, showMarkers])

  useEffect(() => {
    layer.current?.emphasize(emphasized)
  }, [globe, emphasized])

  useEffect(() => {
    const current = layer.current
    if (!current) return
    for (const country of countries) {
      const color = colorOf(country)
      if (painted.current.get(country) === color) continue
      current.paint(country, color)
      painted.current.set(country, color)
    }
  }, [globe, colorOf])
}

const RISE_MS = 300

/** Shows the selected country raised above the others, rising smoothly into place. */
export function useSelectedCountry(globe: GlobeMethods | null, selected: CountryFeature | null, color: string) {
  const raised = useRef<ReturnType<typeof createRaisedCountry> | null>(null)

  useEffect(() => {
    if (!globe || !selected) return
    const radius = globe.getGlobeRadius()
    const base = radius * (1 + LAND_ALTITUDE)
    const top = radius * (1 + SELECTED_ALTITUDE)
    const country = createRaisedCountry(selected, radius, top)
    raised.current = country
    const scene = globe.scene()
    scene.add(country.object)

    // Start level with the other countries and ease up
    const start = performance.now()
    let frame = 0
    const rise = () => {
      const t = Math.min(1, (performance.now() - start) / RISE_MS)
      const eased = 1 - (1 - t) ** 3
      country.object.scale.setScalar((base + (top - base) * eased) / top)
      if (t < 1) frame = requestAnimationFrame(rise)
    }
    rise()

    return () => {
      cancelAnimationFrame(frame)
      scene.remove(country.object)
      country.dispose()
      raised.current = null
    }
  }, [globe, selected])

  useEffect(() => {
    raised.current?.setColor(color)
  }, [globe, selected, color])
}

/**
 * Keeps the depth buffer precise at every zoom level. With a fixed, tiny
 * near plane, zooming out leaves too little precision to tell the land from
 * the ocean just below it, and the two flicker. Moving the near plane out
 * with the camera fixes that. Also stops the camera from zooming into the land.
 */
export function useDepthPrecision(globe: GlobeMethods | null) {
  useEffect(() => {
    if (!globe) return
    const camera = globe.camera() as PerspectiveCamera
    const controls = globe.controls()
    const radius = globe.getGlobeRadius()
    controls.minDistance = radius * (1 + SELECTED_ALTITUDE * 2)

    const update = () => {
      const near = Math.max(0.1, (camera.position.length() - radius) * 0.5)
      if (Math.abs(near - camera.near) / camera.near < 0.01) return
      camera.near = near
      camera.updateProjectionMatrix()
    }
    update()
    controls.addEventListener('change', update)
    return () => controls.removeEventListener('change', update)
  }, [globe])
}

/**
 * Idle spin that eases in and out instead of starting and stopping abruptly.
 * Any interaction with the globe (moving the pointer over it, dragging,
 * zooming) stops it; it resumes once the globe has been left alone for
 * IDLE_DELAY_MS. It spins right away when the page opens.
 */
export function useSmoothAutoRotate(globe: GlobeMethods | null, allowed: boolean) {
  const [idle, setIdle] = useState(true)

  useEffect(() => {
    const controls = globe?.controls()
    if (!globe || !controls) return
    const element = globe.renderer().domElement
    controls.autoRotate = false
    controls.autoRotateSpeed = 0

    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let held = false
    const wake = () => {
      clearTimeout(idleTimer)
      setIdle(false)
      // While the globe is held, the wait only starts once it's let go
      if (!held) idleTimer = setTimeout(() => setIdle(true), IDLE_DELAY_MS)
    }
    // Grabbing stops the spin at once rather than easing out
    const grab = () => {
      held = true
      controls.autoRotate = false
      controls.autoRotateSpeed = 0
      wake()
    }
    const release = () => {
      held = false
      wake()
    }
    controls.addEventListener('start', grab)
    controls.addEventListener('end', release)
    element.addEventListener('pointermove', wake)
    return () => {
      clearTimeout(idleTimer)
      controls.removeEventListener('start', grab)
      controls.removeEventListener('end', release)
      element.removeEventListener('pointermove', wake)
    }
  }, [globe])

  const targetSpeed = allowed && idle ? SPIN_SPEED : 0

  useEffect(() => {
    const controls = globe?.controls()
    if (!controls) return
    let frame = 0
    const step = () => {
      controls.autoRotateSpeed = approach(controls.autoRotateSpeed, targetSpeed, SPIN_EASING)
      controls.autoRotate = controls.autoRotateSpeed !== 0
      if (controls.autoRotateSpeed !== targetSpeed) frame = requestAnimationFrame(step)
    }
    step()
    return () => cancelAnimationFrame(frame)
  }, [globe, targetSpeed])
}

type PointerOptions = {
  /** `position` is the point on the globe under the pointer, if any, and `point` the pointer on the screen */
  onHover: (country: CountryFeature | null, position: LatLng | null, point: Point | null) => void
  onClick: (country: CountryFeature | null, position: LatLng | null, point: Point) => void
  /** Whether tiny places' markers are shown, and so can be pointed at */
  markers?: boolean
}

/**
 * Hover and click detection for countries, via pointer handlers to spread on
 * the element wrapping the globe. Hover is re-checked at most once per frame,
 * including while the globe moves under a still pointer.
 */
export function useCountryPointer(globe: GlobeMethods | null, { onHover, onClick, markers = true }: PointerOptions) {
  const pointer = useRef<Point | null>(null)
  const pressedAt = useRef<Point | null>(null)
  const frame = useRef(0)

  const countryAt = useCallback(
    ({ x, y }: Point): [CountryFeature | null, LatLng | null] => {
      const pos = globe && screenToLatLng(globe, x, y)
      if (!pos) return [null, null]
      // How far one pixel is on the globe here, to turn pixel tolerances into distances
      const beside = screenToLatLng(globe, x + 1, y) ?? screenToLatLng(globe, x - 1, y)
      const perPixel = beside ? geoDistance([pos.lng, pos.lat], [beside.lng, beside.lat]) : 0
      const country = findCountryNear(pos.lat, pos.lng, {
        markerRadius: markers ? MARKER_HIT_PX * perPixel : 0,
        tolerance: NEAR_MISS_PX * perPixel,
      })
      return [country, pos]
    },
    [globe, markers],
  )

  // The latest callbacks, so a pending hover isn't dropped when the caller re-renders with new ones
  const latest = useRef({ countryAt, onHover })
  useLayoutEffect(() => {
    latest.current = { countryAt, onHover }
  })

  const scheduleHover = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const point = pointer.current
      const [country, position] = point ? latest.current.countryAt(point) : [null, null]
      latest.current.onHover(country, position, point)
    })
  }, [])

  useEffect(() => {
    const controls = globe?.controls()
    if (!controls) return
    controls.addEventListener('change', scheduleHover)
    return () => {
      controls.removeEventListener('change', scheduleHover)
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [globe, scheduleHover])

  return {
    onPointerMove: (e: PointerEvent) => {
      // Touch has no hover; a finger on the globe is always a tap or a drag
      if (e.pointerType !== 'mouse') return
      pointer.current = { x: e.clientX, y: e.clientY }
      scheduleHover()
    },
    onPointerLeave: () => {
      pointer.current = null
      scheduleHover()
    },
    onPointerDown: (e: PointerEvent) => {
      if (e.button === 0) pressedAt.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: PointerEvent) => {
      const releasedAt = { x: e.clientX, y: e.clientY }
      if (pressedAt.current && isClick(pressedAt.current, releasedAt)) onClick(...countryAt(releasedAt), releasedAt)
      pressedAt.current = null
    },
  }
}

/** Data loaded in the background, or null until it's there */
function useLoaded<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    let current = true
    load().then((loaded) => current && setData(loaded))
    return () => {
      current = false
    }
  }, [load])
  return data
}

/** The states and provinces, once loaded (they load in the background after the globe). */
export const useRegions = () => useLoaded(loadRegions)

/** The well-known cities, once loaded */
export const useCities = (): City[] | null => useLoaded(loadCities)

/** Pins in `color`, at `pins` */
export function usePinLayer(globe: GlobeMethods | null, pins: readonly Pin[], color: string) {
  const layer = useRef<PinLayer | null>(null)

  useEffect(() => {
    if (!globe) return
    const scene = globe.scene()
    const created = createPinLayer(globe.getGlobeRadius())
    scene.add(created.object)
    layer.current = created
    return () => {
      scene.remove(created.object)
      created.dispose()
      layer.current = null
    }
  }, [globe])

  useEffect(() => {
    layer.current?.setColor(color)
  }, [globe, color])

  useEffect(() => {
    layer.current?.show(pins)
  }, [globe, pins])
}

/** Draws states and provinces over their countries: `fills` in their colors, and `outlines`. */
export function useRegionLayer(
  globe: GlobeMethods | null,
  regions: readonly RegionFeature[] | null,
  fills: ReadonlyMap<RegionFeature, string>,
  outlines: readonly RegionFeature[],
  theme: Theme,
) {
  const layer = useRef<RegionLayer | null>(null)

  useEffect(() => {
    if (!globe || !regions) return
    const scene = globe.scene()
    const created = createRegionLayer(regions, globe.getGlobeRadius())
    scene.add(created.object)
    layer.current = created
    return () => {
      scene.remove(created.object)
      created.dispose()
      layer.current = null
    }
  }, [globe, regions])

  useEffect(() => {
    layer.current?.setOutlineColor(theme.border, theme.borderOpacity * 0.7)
  }, [globe, regions, theme])

  useEffect(() => {
    layer.current?.show(fills, outlines)
  }, [globe, regions, fills, outlines])
}
