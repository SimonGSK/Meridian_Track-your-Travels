import { useState } from 'react'
import type { CountryFeature } from './countries'
import { flagUrl } from './flags'

/** The hovered country's flag in the bottom-right corner. */
export default function FlagCorner({ country }: { country: CountryFeature | null }) {
  // Keep showing the last flag while it fades out
  const [shown, setShown] = useState(country)
  if (country && country !== shown) setShown(country)

  const url = shown && flagUrl(shown)
  const visible = !!country && !!url

  return (
    <figure className={`flag${visible ? ' flag-visible' : ''}`} aria-hidden={!visible}>
      {url && <img src={url} alt={`Flag of ${shown.properties.name}`} />}
    </figure>
  )
}
