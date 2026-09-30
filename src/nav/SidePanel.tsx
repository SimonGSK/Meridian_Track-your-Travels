import type { ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

/** The panel that slides out next to the menu. */
export default function SidePanel({ title, onClose, children }: Props) {
  return (
    <section id="side-panel" className="side-panel" aria-labelledby="side-panel-title">
      <header className="side-panel-header">
        <h2 id="side-panel-title">{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </header>
      <div className="side-panel-body">{children}</div>
    </section>
  )
}
