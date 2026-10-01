import type { ReactNode } from 'react'

const YEAR = new Date().getFullYear()

/** The bar along the top: the brand, the tabs and the status on the right. */
export default function TopBar({ tabs, status }: { tabs: ReactNode; status: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          MER
        </span>
        <span className="brand-text">
          <h1>Meridian</h1>
          <span className="brand-sub">Atlas OS · {YEAR}</span>
        </span>
      </div>
      {tabs}
      <p className="status">{status}</p>
    </header>
  )
}
