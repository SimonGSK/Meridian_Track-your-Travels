import { useEffect } from 'react'
import { CloseIcon } from '../icons'
import type { Removal } from './useUndo'

/** How long the note stays, to change your mind */
export const UNDO_MS = 8000

type Props = {
  /** The last thing removed, until undone or gone */
  removal: Removal | null
  onDone: () => void
}

/** Typing in a field, where Cmd/Ctrl+Z is the field's own undo */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * A note at the bottom after removing something, "Removed Japan · Undo",
 * gone after a few seconds or when something else is removed. Cmd/Ctrl+Z
 * undoes it too, while not typing.
 */
export default function UndoToast({ removal, onDone }: Props) {
  useEffect(() => {
    if (!removal) return
    const timer = setTimeout(onDone, UNDO_MS)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'z' || !(e.metaKey || e.ctrlKey) || e.shiftKey || isTyping(e.target)) return
      e.preventDefault()
      removal.undo()
      onDone()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [removal, onDone])

  return (
    <div className="undo-toast-region" aria-live="polite">
      {removal && (
        <div className="undo-toast">
          <span className="undo-toast-text">{removal.message}</span>
          <button
            type="button"
            className="undo-button"
            onClick={() => {
              removal.undo()
              onDone()
            }}
          >
            Undo
          </button>
          <button type="button" className="close-button" onClick={onDone} aria-label="Dismiss">
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  )
}
