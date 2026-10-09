import { CloseIcon } from '../icons'

type Props = {
  /** Switches to the new version, reloading the app */
  onReload: () => void
  /** Not now: it takes over the next time the app is opened anyway */
  onDismiss: () => void
}

/** A note at the bottom that a new version is ready, to reload into; it stays until then, or put away */
export default function UpdateToast({ onReload, onDismiss }: Props) {
  return (
    <div className="undo-toast update-toast" role="status">
      <span className="undo-toast-text">A new version is ready</span>
      <button type="button" className="undo-button" onClick={onReload}>
        Reload
      </button>
      <button type="button" className="close-button" onClick={onDismiss} aria-label="Not now">
        <CloseIcon />
      </button>
    </div>
  )
}
