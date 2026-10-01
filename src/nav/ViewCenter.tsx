import { useEffect, useState } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { formatLatLng } from './formatLatLng'

/**
 * The point in the middle of the view, updated as the globe turns. Its own
 * component, so the rest of the app doesn't re-render with every frame.
 */
export default function ViewCenter({ globe }: { globe: GlobeMethods | null }) {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const controls = globe?.controls()
    if (!globe || !controls) return
    let frame = 0
    const update = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const { lat, lng } = globe.pointOfView()
        setText(formatLatLng(lat, lng))
      })
    }
    update()
    controls.addEventListener('change', update)
    return () => {
      controls.removeEventListener('change', update)
      cancelAnimationFrame(frame)
    }
  }, [globe])

  return text && <span className="view-center">{text}</span>
}
