import { useMemo } from 'react'
import type { CountryFeature } from '../countries'
import { shapePath } from './shapes'

const [WIDTH, HEIGHT] = [260, 190]

/** A country's outline on its own, with nothing to give it away. */
export default function CountryShape({ country }: { country: CountryFeature }) {
  const path = useMemo(() => shapePath(country, WIDTH, HEIGHT), [country])
  return (
    <svg className="game-shape" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="The outline to identify">
      <path d={path} />
    </svg>
  )
}
