import { useEffect, useRef } from 'react'

/** A label that follows the mouse. Positioned outside React to avoid re-rendering on every move. */
export default function Tooltip({ text }: { text: string | null }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ref.current?.style.setProperty('transform', `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div ref={ref} className="tooltip" role="tooltip" hidden={!text}>
      {text}
    </div>
  )
}
