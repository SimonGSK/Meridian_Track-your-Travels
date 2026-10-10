import type { CSSProperties } from 'react'
import { THEMES, landColor, type Theme } from '../globe/themes'

type Props = {
  theme: Theme
  onChange: (id: string) => void
}

/** A tiny globe in the theme's colors, or with its picture of the Earth (Europe and Africa, a place over them visited) */
function Preview({ theme }: { theme: Theme }) {
  const border = { stroke: theme.border, strokeOpacity: theme.borderOpacity, strokeWidth: 1 }
  if (theme.imagery) {
    const clip = `preview-${theme.id}`
    return (
      <svg className="theme-preview" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <circle cx="32" cy="32" r="27" />
          </clipPath>
        </defs>
        <circle cx="32" cy="32" r="30" fill={theme.atmosphere} opacity="0.25" />
        <image href={theme.imagery.map} x="-51" y="-1" width="150" height="75" preserveAspectRatio="none" clipPath={`url(#${clip})`} />
        <path d="M41 34c3-1 7 1 8 4 0 3-3 4-6 4-2 0-4-2-4-4 0-2 0-3 2-4z" fill={theme.visited} opacity={theme.imagery.tint} {...border} />
      </svg>
    )
  }
  return (
    <svg className="theme-preview" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill={theme.atmosphere} opacity="0.25" />
      <circle cx="32" cy="32" r="27" fill={theme.ocean} />
      <path d="M14 22c6-8 16-9 21-5 4 3 1 8 5 11 5 4 2 11-4 12-7 1-9-5-14-5-6 0-11-6-8-13z" fill={landColor(theme, 0)} {...border} />
      <path d="M28 38c4-2 9 0 11 4 2 5-2 11-7 12-4 0-7-4-6-8 0-3-1-6 2-8z" fill={landColor(theme, 1)} {...border} />
      <path d="M42 16c5 1 9 5 10 10 0 4-4 5-7 3-3-2-6-2-6-6 0-4 0-7 3-7z" fill={landColor(theme, 2)} {...border} />
      <path d="M41 34c3-1 7 1 8 4 0 3-3 4-6 4-2 0-4-2-4-4 0-2 0-3 2-4z" fill={theme.visited} {...border} />
    </svg>
  )
}

/** Each design as a tiny globe, all in a row, with the one chosen named under them */
export default function DesignPanel({ theme, onChange }: Props) {
  return (
    <>
      <div className="theme-row" role="group" aria-label="Design" style={{ '--designs': THEMES.length } as CSSProperties}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="theme-sample"
            aria-label={t.name}
            title={t.name}
            aria-pressed={t.id === theme.id}
            onClick={() => onChange(t.id)}
          >
            <Preview theme={t} />
          </button>
        ))}
      </div>
      <p className="theme-name">{theme.name}</p>
    </>
  )
}
