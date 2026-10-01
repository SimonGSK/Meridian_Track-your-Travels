import type { ReactNode } from 'react'
import { CloseIcon } from '../icons'

type Props = {
  title: string
  onClose: () => void
  /** Cards */
  children: ReactNode
}

/** The column on the right with the open tab's cards (a sheet from the bottom on phones). */
export default function SidePanel({ title, onClose, children }: Props) {
  return (
    <section id="side-panel" className="side-panel" aria-labelledby="side-panel-title">
      <h2 id="side-panel-title" className="sr-only">
        {title}
      </h2>
      <button type="button" className="close-button sheet-close" onClick={onClose} aria-label="Close panel">
        <CloseIcon />
      </button>
      {children}
    </section>
  )
}
