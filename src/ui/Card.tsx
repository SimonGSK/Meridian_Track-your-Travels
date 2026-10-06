import { useId, type ReactNode } from 'react'

type Props = {
  label: string
  /** On the right of the header, in the accent color: a count, a code, a name */
  meta?: ReactNode
  /** Extra controls at the far right of the header, like a close button */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** A panel section with a small monospace header: "GAMES ··· 06". */
export default function Card({ label, meta, actions, className, children }: Props) {
  const id = useId()
  return (
    <section className={`card${className ? ` ${className}` : ''}`} aria-labelledby={id}>
      <header className="card-header">
        <h3 id={id} className="card-label">
          {label}
        </h3>
        {meta !== undefined && <span className="card-meta">{meta}</span>}
        {actions}
      </header>
      {children}
    </section>
  )
}
