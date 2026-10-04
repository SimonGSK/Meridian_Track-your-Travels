import { useEffect } from 'react'
import { CloseIcon, TrophyIcon } from '../icons'
import type { Achievement } from './achievements'

/** How long the note stays */
export const TOAST_MS = 6000

type Props = {
  /** Just earned */
  achievements: readonly Achievement[]
  /** Shows them all, in the Visited tab */
  onOpen: () => void
  onDismiss: () => void
}

/** A note at the bottom when you earn an achievement, gone after a few seconds */
export default function AchievementToast({ achievements, onOpen, onDismiss }: Props) {
  useEffect(() => {
    if (achievements.length === 0) return
    const timer = setTimeout(onDismiss, TOAST_MS)
    return () => clearTimeout(timer)
  }, [achievements, onDismiss])

  const [first, ...rest] = achievements
  return (
    <div className="achievement-toast-region" aria-live="polite">
      {first && (
        <div className="achievement-toast">
          <span className="achievement-badge" aria-hidden="true">
            <TrophyIcon size={20} />
          </span>
          <button type="button" className="achievement-toast-text" onClick={onOpen}>
            <span className="achievement-toast-label">Achievement unlocked</span>
            <strong>
              {first.title}
              {rest.length > 0 && ` and ${rest.length} more`}
            </strong>
            <span className="muted">{first.description}</span>
          </button>
          <button type="button" className="close-button" onClick={onDismiss} aria-label="Dismiss">
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  )
}
