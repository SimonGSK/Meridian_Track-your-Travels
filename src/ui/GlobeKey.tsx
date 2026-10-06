import { useId } from 'react'

export type KeyItem = { label: string; color: string }

/** What colors on the globe mean, in the corner: "VISITS 1 2 3 4+", "YOU BOTH ANNA" */
export default function GlobeKey({ title, items }: { title: string; items: readonly KeyItem[] }) {
  const id = useId()
  return (
    <figure className="globe-key" aria-labelledby={id}>
      <figcaption id={id}>{title}</figcaption>
      <ol aria-label={`${title}: ${items.map((item) => item.label).join(', ')}`}>
        {items.map(({ label, color }) => (
          <li key={label}>
            <span className="key-swatch" style={{ background: color }} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
    </figure>
  )
}
