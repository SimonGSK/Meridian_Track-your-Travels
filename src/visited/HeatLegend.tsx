import { useId } from 'react'
import { HEAT_MAX_VISITS } from '../globe/themes'

/** What the heat map's shades mean, over the globe: "VISITS 1 2 3 4+" */
export default function HeatLegend({ colors }: { colors: readonly string[] }) {
  const id = useId()
  return (
    <figure className="heat-legend" aria-labelledby={id}>
      <figcaption id={id}>Visits</figcaption>
      <ol aria-label="Visits, from one to many">
        {colors.map((color, i) => {
          const visits = i + 1 === HEAT_MAX_VISITS ? `${i + 1}+` : String(i + 1)
          return (
            <li key={visits}>
              <span className="heat-swatch" style={{ background: color }} aria-hidden="true" />
              {visits}
            </li>
          )
        })}
      </ol>
    </figure>
  )
}
