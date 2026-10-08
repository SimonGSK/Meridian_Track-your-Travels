import { useState } from 'react'
import type { CountryFeature } from '../countries'
import { EyeIcon, EyeOffIcon, StarIcon } from '../icons'
import StatsBox from '../ui/StatsBox'
import { FRIEND_NAME_MAX, readShared, shareLink, type Comparison, type Friend } from './friend'
import { Flag } from './VisitedPanel'
import { noAutofill } from '../ui/noAutofill'

type Props = {
  /** Your places, by name */
  visited: ReadonlySet<string>
  friend: Friend | null
  /** Where you've both been, and only one of you, once there's a friend */
  comparison: Comparison | null
  onFriend: (friend: Friend | null) => void
  /** Whether your friend's places show on the globe */
  shown: boolean
  onShownChange: (shown: boolean) => void
  /** For the places only your friend has been: on your wishlist, and on or off it again */
  wishlist: ReadonlySet<string>
  onWish: (name: string) => void
  onUnwish: (name: string) => void
  onShow: (country: CountryFeature) => void
}

/** A group of places: who's been, with flags; your friend's can go on your wishlist, and off it again */
function Places(props: {
  label: string
  places: CountryFeature[]
  wishlist?: ReadonlySet<string>
  onWish?: (name: string) => void
  onUnwish?: (name: string) => void
  onShow: (country: CountryFeature) => void
}) {
  const { label, places, wishlist, onWish, onUnwish, onShow } = props
  if (places.length === 0) return null
  return (
    <>
      <h3>
        {label} <span className="muted">{places.length}</span>
      </h3>
      <ul className="country-list" aria-label={label}>
        {places.map((c) => {
          const { name } = c.properties
          const wished = !!wishlist?.has(name)
          return (
            <li key={name} className="country-item">
              <button type="button" className="country-row" onClick={() => onShow(c)}>
                <Flag country={c} />
                <span className="row-name">{name}</span>
              </button>
              {onWish && onUnwish && (
                <button
                  type="button"
                  className={`icon-button small wish-star${wished ? ' on' : ''}`}
                  aria-label={wished ? `Take ${name} off your wishlist` : `Add ${name} to your wishlist`}
                  onClick={() => (wished ? onUnwish(name) : onWish(name))}
                >
                  <StarIcon size={15} filled={wished} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** The Visited tab's comparing with a friend: your link to send them, theirs pasted in, and where you've each been */
export default function CompareView(props: Props) {
  const { visited, friend, comparison, onFriend, shown, onShownChange } = props
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink(name, visited))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  const compare = () => {
    const read = readShared(pasted)
    if (!read) return setError("That isn't a Meridian link. Paste the whole link your friend sent.")
    setError(null)
    setPasted('')
    onFriend(read)
    onShownChange(true)
  }

  return (
    <div className="compare">
      {friend && comparison ? (
        <>
          <StatsBox
            label={`You and ${friend.name}`}
            stats={[
              { label: 'You', value: visited.size },
              { label: 'Both', value: comparison.both.length },
              { label: friend.name, value: friend.places.length },
            ]}
          />
          <button
            type="button"
            role="switch"
            aria-checked={shown}
            className="row-button layer"
            onClick={() => onShownChange(!shown)}
          >
            <span className="dot wish" aria-hidden="true" />
            <span>Show {friend.name} on the globe</span>
            <span className="eye" aria-hidden="true">
              {shown ? <EyeIcon /> : <EyeOffIcon />}
            </span>
          </button>
          <Places
            label={`Only ${friend.name}`}
            places={comparison.onlyFriend}
            wishlist={props.wishlist}
            onWish={props.onWish}
            onUnwish={props.onUnwish}
            onShow={props.onShow}
          />
          <Places label="Both of you" places={comparison.both} onShow={props.onShow} />
          <Places label="Only you" places={comparison.onlyYou} onShow={props.onShow} />
          <button type="button" className="text-button" onClick={() => onFriend(null)}>
            Remove {friend.name}
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            See where you've both been, on one globe. Send a friend your link; they paste it in their Meridian, and you
            paste theirs here. Only your places go in it: not your cities, flights or dates.
          </p>
          <form
            className="compare-paste"
            onSubmit={(e) => {
              e.preventDefault()
              compare()
            }}
          >
            <label htmlFor="friend-link">Your friend's link</label>
            <input
              {...noAutofill('friend-link')}
              id="friend-link"
              type="text"
              placeholder="Paste it here"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <button type="submit" className="primary-button" disabled={!pasted.trim()}>
              Compare
            </button>
            {error && <p className="input-hint">{error}</p>}
          </form>
        </>
      )}

      <h3>Your link</h3>
      <div className="compare-share">
        <input
          {...noAutofill('your-name')}
          type="text"
          aria-label="Your name, for your friend"
          placeholder="Your name"
          maxLength={FRIEND_NAME_MAX}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setCopied(false)
          }}
        />
        <button type="button" className="primary-button secondary" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy my link'}
        </button>
      </div>
      <p className="muted compare-note">With your {visited.size} places, as they are now.</p>
    </div>
  )
}
