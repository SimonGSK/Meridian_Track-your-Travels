import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { borders, countries, findCountryAt, type CountryFeature } from '../countries'
import { createCountryLayer, type CountryLayer } from './countryLayer'
import { approach, isClick, type Point } from './interaction'
import { screenToLatLng } from './picking'
import { COLORS } from './style'

export const SPIN_SPEED = 0.4
export const RESUME_DELAY_MS = 2500
/** Fraction of the remaining speed difference covered each frame */
const SPIN_EASING = 0.04

/** Adds the merged country mesh to the globe's scene and colors the hovered country. */
export function useCountryLayer(globe: GlobeMethods | null, hovered: CountryFeature | null) {
  const layer = useRef<CountryLayer | null>(null)

  useEffect(() => {
    if (!globe) return
    const scene = globe.scene()
    const created = createCountryLayer(countries, borders, globe.getGlobeRadius())
    scene.add(created.object)
    layer.current = created
    return () => {
      scene.remove(created.object)
      created.dispose()
      layer.current = null
    }
  }, [globe])

  useEffect(() => {
    const current = layer.current
    if (!current || !hovered) return
    current.paint(hovered, COLORS.hover)
    return () => current.paint(hovered, null)
  }, [globe, hovered])
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
