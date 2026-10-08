import { useId, useState } from 'react'
import type { CountryFeature } from '../countries'
import { countryOfCapital } from '../data/capitals'
import { noAutofill } from '../ui/noAutofill'

type Props = {
  /** The country whose capital was typed, and the capital as typed */
  onAnswer: (country: CountryFeature, typed: string) => void
}

/**
 * A text box for naming a capital from memory: no suggestions, as they'd
 * give answers away. Accepts any known name ("Kiev", "Washington"),
 * ignoring case, accents and punctuation.
 */
export default function CapitalInput({ onAnswer }: Props) {
  const [text, setText] = useState('')
  const [unknown, setUnknown] = useState<string | null>(null)
  const id = useId()

  const submit = () => {
    const typed = text.trim()
    if (!typed) return
    const country = countryOfCapital(typed)
    if (!country) return setUnknown(typed)
    onAnswer(country, typed)
    setText('')
  }

  return (
    <div className="country-input">
      <label htmlFor={id}>Your answer</label>
      <input
        {...noAutofill('capital')}
        id={id}
        type="text"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        // Focus moves here so you can start typing straight away
        autoFocus
        placeholder="Type a capital and press Enter"
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
          No capital called “{unknown}”. Try another spelling.
        </p>
      )}
    </div>
  )
}
