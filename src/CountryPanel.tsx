import type { ComponentProps } from 'react'
import type { CountryFeature } from './countries'
import { factsOf, formatArea, formatAreaShort, formatPopulation, formatPopulationShort } from './data/facts'
import { CheckIcon, CloseIcon, PlusIcon } from './icons'
import CityPicker from './CityPicker'
import RegionPicker from './RegionPicker'
import VisitsCard from './visited/VisitsCard'

type Props = {
  country: CountryFeature
  visited: boolean
  onToggleVisited: () => void
  onClose: () => void
  /** For countries with states or provinces */
  regions?: ComponentProps<typeof RegionPicker>
  /** For countries with cities to pick */
  cities?: ComponentProps<typeof CityPicker>
  /** When you went, once it's visited */
  visits?: ComponentProps<typeof VisitsCard>
}

/** The selected country, on the left: "(A) SELECTED COUNTRY", its facts, cities and states. */
export default function CountryPanel({ country, visited, onToggleVisited, onClose, regions, cities, visits }: Props) {
  const { name, kind, continent, areaKm2: mapArea, isoCode, isoAlpha2 } = country.properties
  const facts = factsOf(country)
  const code = isoCode ?? isoAlpha2
  const regionCount = regions?.regions && `${regions.regions.length} ${regions.label.toLowerCase()}`

  return (
    <aside className="panel country-panel" aria-labelledby="country-panel-title">
      <header className="card-header">
        <span className="card-label">(A) Selected {kind === 'country' ? 'country' : 'territory'}</span>
        {code && <span className="card-meta">ISO {code}</span>}
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </header>
      <h2 id="country-panel-title" className="country-name">
        {name}
      </h2>
      <p className="panel-meta">{[continent, regionCount].filter(Boolean).join(' · ')}</p>
      {facts && <Facts facts={facts} mapArea={mapArea} />}
      {visits && <VisitsCard {...visits} />}
      {cities && <CityPicker {...cities} />}
      {regions && <RegionPicker {...regions} />}
      <button
        type="button"
        className={`atlas-button${visited ? ' on' : ''}`}
        aria-pressed={visited}
        onClick={onToggleVisited}
      >
        {visited ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
        {visited ? 'In visited atlas' : 'Add to visited atlas'}
      </button>
    </aside>
  )
}

function Facts({ facts, mapArea }: { facts: NonNullable<ReturnType<typeof factsOf>>; mapArea: number }) {
  const { capital, population, populationYear, areaKm2, note, source } = facts
  const area = areaKm2 ?? Math.round(mapArea)
  return (
    <>
      <dl className="facts">
        <div className="fact fact-wide">
          <dt>Capital</dt>
          <dd className="fact-capital">{capital ?? 'None'}</dd>
        </div>
        <div className="fact">
          <dt>Inhabitants</dt>
          <dd className="fact-number" title={population ? formatPopulation(population) : undefined}>
            {population === null ? '–' : population === 0 ? 'None' : formatPopulationShort(population)}
          </dd>
        </div>
        <div className="fact">
          <dt>Area</dt>
          <dd className="fact-number" title={formatArea(area)}>
            {areaKm2 ? '' : '≈ '}
            {formatAreaShort(area)}
          </dd>
        </div>
      </dl>
      {note && <p className="facts-note">{note}</p>}
      <p className="facts-source">
        {source === 'World Bank' ? 'Source: World Bank (CC BY 4.0)' : 'Estimate'}
        {populationYear && population ? ` · ${populationYear}` : ''}
      </p>
    </>
  )
}
