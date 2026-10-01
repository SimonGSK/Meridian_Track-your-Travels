import type { ComponentProps } from 'react'
import type { CountryFeature } from './countries'
import { factsOf, formatArea, formatPopulation } from './data/facts'
import { CheckIcon } from './icons'
import RegionPicker from './RegionPicker'

type Props = {
  country: CountryFeature
  visited: boolean
  onToggleVisited: () => void
  onClose: () => void
  /** For countries with states or provinces */
  regions?: ComponentProps<typeof RegionPicker>
}

export default function CountryPanel({ country, visited, onToggleVisited, onClose, regions }: Props) {
  const { name, kind, continent, areaKm2: mapArea } = country.properties
  const facts = factsOf(country)

  return (
    <aside className="panel" aria-labelledby="country-panel-title">
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2 id="country-panel-title">{name}</h2>
      <p className="panel-meta">
        {kind === 'country' ? 'Country' : 'Territory'} in {continent}
      </p>
      {facts && <Facts facts={facts} mapArea={mapArea} />}
      <button
        type="button"
        className={`toggle-button${visited ? ' on' : ''}`}
        aria-pressed={visited}
        onClick={onToggleVisited}
      >
        {visited && <CheckIcon />}
        {visited ? 'Visited' : 'Mark as visited'}
      </button>
      {regions && <RegionPicker {...regions} />}
    </aside>
  )
}

function Facts({ facts, mapArea }: { facts: NonNullable<ReturnType<typeof factsOf>>; mapArea: number }) {
  const { capital, population, populationYear, areaKm2, note, source } = facts
  return (
    <>
      <dl className="facts">
        {capital && (
          <>
            <dt>Capital</dt>
            <dd>{capital}</dd>
          </>
        )}
        {population !== null && (
          <>
            <dt>Population</dt>
            <dd>
              {population === 0 ? 'None' : formatPopulation(population)}
              {populationYear && population > 0 && <span className="muted"> ({populationYear})</span>}
            </dd>
          </>
        )}
        <dt>Area</dt>
        <dd>{areaKm2 ? formatArea(areaKm2) : `about ${formatArea(Math.round(mapArea))}`}</dd>
      </dl>
      {note && <p className="facts-note">{note}</p>}
      <p className="facts-source">
        {source === 'World Bank' ? 'Source: World Bank (CC BY 4.0)' : 'Estimate'}
      </p>
    </>
  )
}
