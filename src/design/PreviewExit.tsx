import { useEffect, useState } from 'react'

/** How long the button stays after the mouse stops */
export const PREVIEW_EXIT_SHOWN_MS = 2500

/**
 * The way out of the screensaver's preview: shown at first, and again while
 * the mouse moves or on a tap (phones have no mouse to move); and Escape.
 * `onExit` must stay the same function: a listener added again during a
 * redraw would miss the key press that caused it.
 */
export default function PreviewExit({ onExit }: { onExit: () => void }) {
  // Shown as the preview opens, so the way out is seen before it's needed
  const [shown, setShown] = useState(true)

  useEffect(() => {
    let timer = setTimeout(() => setShown(false), PREVIEW_EXIT_SHOWN_MS)
    const wake = () => {
      setShown(true)
      clearTimeout(timer)
      timer = setTimeout(() => setShown(false), PREVIEW_EXIT_SHOWN_MS)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onExit])

  return (
    <button type="button" className={`preview-exit${shown ? ' shown' : ''}`} onClick={onExit}>
      Exit preview <kbd>Esc</kbd>
    </button>
  )
}
