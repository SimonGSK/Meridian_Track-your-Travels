import { useId, useState } from 'react'
import { findCountryByName, type CountryFeature } from '../countries'
import { matchKey } from '../data/names'
import { noAutofill } from '../ui/noAutofill'

type Props = {
  /** `alias` is the name used when it isn't the usual one, e.g. "Swaziland" */
  onAnswer: (country: CountryFeature, alias: string | null) => void
  label?: string
}

/**
 * A text box for naming a country from memory: no suggestions, as they'd
 * give answers away. Accepts any known spelling ("East Timor", "Swaziland"),
 * ignoring case, accents and punctuation.
 */
export default function CountryInput({ onAnswer, label = 'Your answer' }: Props) {
  const [text, setText] = useState('')
  const [unknown, setUnknown] = useState<string | null>(null)
  const id = useId()

  const submit = () => {
    const typed = text.trim()
    if (!typed) return
    const country = findCountryByName(typed)
    if (!country) return setUnknown(typed)
    onAnswer(country, matchKey(country.properties.name) === matchKey(typed) ? null : typed)
    setText('')
  }

  return (
    <div className="country-input">
      <label htmlFor={id}>{label}</label>
      <input
        {...noAutofill('answer')}
        id={id}
        type="text"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        // Focus moves here so you can start typing straight away
        autoFocus
        placeholder="Type a country and press Enter"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setUnknown(null)
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          submit()
        }}
      />
      {unknown && (
        <p className="input-hint" role="alert">
          No country called “{unknown}”. Try another spelling.
        </p>
      )}
    </div>
  )
}
