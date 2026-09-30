import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { PerspectiveCamera } from 'three'
import { borders, countries, findCountryAt, type CountryFeature } from '../countries'
import { createCountryLayer, createRaisedCountry, type CountryLayer } from './countryLayer'
import { approach, isClick, type Point } from './interaction'
import { screenToLatLng } from './picking'
import { LAND_ALTITUDE, SELECTED_ALTITUDE } from './style'
import type { Theme } from './themes'

export const SPIN_SPEED = 0.4
export const RESUME_DELAY_MS = 2500
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
 * Stops instantly when the user grabs the globe, and resumes a moment after
 * they let go.
 */
export function useSmoothAutoRotate(globe: GlobeMethods | null, active: boolean) {
  const [interacting, setInteracting] = useState(false)

  useEffect(() => {
    const controls = globe?.controls()
    if (!controls) return
    controls.autoRotate = false
    controls.autoRotateSpeed = 0

    let resumeTimer: ReturnType<typeof setTimeout> | undefined
    const onStart = () => {
      clearTimeout(resumeTimer)
      controls.autoRotate = false
      controls.autoRotateSpeed = 0
      setInteracting(true)
    }
    const onEnd = () => {
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => setInteracting(false), RESUME_DELAY_MS)
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      clearTimeout(resumeTimer)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [globe])

  const targetSpeed = active && !interacting ? SPIN_SPEED : 0

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

type PointerCallbacks = {
  onHover: (country: CountryFeature | null) => void
  onClick: (country: CountryFeature | null) => void
}

/**
 * Hover and click detection for countries, via pointer handlers to spread on
 * the element wrapping the globe. Hover is re-checked at most once per frame,
 * including while the globe moves under a still pointer.
 */
export function useCountryPointer(globe: GlobeMethods | null, { onHover, onClick }: PointerCallbacks) {
  const pointer = useRef<Point | null>(null)
  const pressedAt = useRef<Point | null>(null)
  const frame = useRef(0)

  const countryAt = useCallback(
    ({ x, y }: Point) => {
      const pos = globe && screenToLatLng(globe, x, y)
      return pos ? findCountryAt(pos.lat, pos.lng) : null
    },
    [globe],
  )

  const scheduleHover = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      onHover(pointer.current && countryAt(pointer.current))
    })
  }, [countryAt, onHover])

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
      if (pressedAt.current && isClick(pressedAt.current, releasedAt)) onClick(countryAt(releasedAt))
      pressedAt.current = null
    },
  }
}
