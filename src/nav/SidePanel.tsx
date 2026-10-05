import type { ReactNode } from 'react'
import { CloseIcon } from '../icons'

type Props = {
  title: string
  onClose: () => void
  /** Cards */
  children: ReactNode
}

/**
 * The column on the right with the open tab's cards. On phones it's a
 * sheet from the bottom, with the tab's name and a close button above the
 * cards, which scroll under it rather than under the button.
 */
export default function SidePanel({ title, onClose, children }: Props) {
  return (
    <section id="side-panel" className="side-panel" aria-labelledby="side-panel-title">
      <header className="sheet-header">
        <h2 id="side-panel-title" className="sheet-title">
          {title}
        </h2>
        <button type="button" className="close-button sheet-close" onClick={onClose} aria-label="Close panel">
          <CloseIcon />
        </button>
      </header>
      <div className="side-panel-body">{children}</div>
    </section>
  )
}
