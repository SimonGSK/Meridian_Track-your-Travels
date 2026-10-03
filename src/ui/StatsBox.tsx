import type { ReactNode } from 'react'

export type Stat = {
  label: string
  value: ReactNode
  /** Out of how many, shown smaller after the value: "12 / 197" */
  of?: number
  title?: string
}

/** A row of three figures, like the country facts: "FLIGHTS 12 · DISTANCE 84.3K km · AROUND THE EARTH 2.1×" */
export default function StatsBox({ label, stats }: { label: string; stats: Stat[] }) {
  return (
    <dl className="facts stats" aria-label={label}>
      {stats.map((stat) => (
        <div key={stat.label} className="fact">
          <dt>{stat.label}</dt>
          <dd className="fact-number" title={stat.title}>
            {stat.value}
            {stat.of !== undefined && <span className="stat-of"> / {stat.of}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
