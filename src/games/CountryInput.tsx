import { useId, useState } from 'react'
import { countries, findCountryByName, searchCountries, type CountryFeature } from '../countries'
import { normalizeName } from '../data/names'

type Props = {
  /** `alias` is the name used when it isn't the usual one, e.g. "Swaziland" */
  onAnswer: (country: CountryFeature, alias: string | null) => void
}

const answerable = countries.filter((c) => c.properties.kind === 'country')
const MAX_SUGGESTIONS = 6

/**
 * A text box for naming a country, with suggestions as you type. Accepts any
 * known spelling ("East Timor", "Swaziland"), typed in full or picked.
 */
export default function CountryInput({ onAnswer }: Props) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(-1)
  const [unknown, setUnknown] = useState<string | null>(null)
  const id = useId()
  const listId = `${id}-suggestions`

  const suggestions = searchCountries(text, answerable, MAX_SUGGESTIONS)

  const submit = (country: CountryFeature, alias: string | null) => {
    onAnswer(country, alias)
    setText('')
    setActive(-1)
  }

  // Enter takes the highlighted suggestion, else an exact name, else the top suggestion
  const submitTyped = () => {
    const highlighted = suggestions[active]
    if (highlighted) return submit(highlighted.country, highlighted.matchedAlias)
    const exact = findCountryByName(text)
    if (exact) return submit(exact, normalizeName(exact.properties.name) === normalizeName(text) ? null : text.trim())
    if (suggestions[0]) return submit(suggestions[0].country, suggestions[0].matchedAlias)
    if (text.trim()) setUnknown(text.trim())
  }

  return (
    <div className="country-input">
      <label htmlFor={id}>Your answer</label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        // Focus moves here so you can start typing straight away
        autoFocus
        placeholder="Type a country…"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setActive(-1)
          setUnknown(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, -1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            submitTyped()
          }
        }}
      />
      {suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="suggestions" aria-label="Suggestions">
          {suggestions.map(({ country, matchedAlias }, i) => (
            <li
              key={country.properties.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Keep focus in the text box when picking with the mouse
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(country, matchedAlias)}
            >
              {country.properties.name}
              {matchedAlias && <span className="muted"> ({matchedAlias})</span>}
            </li>
          ))}
        </ul>
      )}
      {unknown && (
        <p className="input-hint" role="alert">
          No country called “{unknown}”. Try another spelling.
        </p>
      )}
    </div>
  )
}
