import { useEffect, useMemo, useRef, useState } from 'react'
import type { CountryFeature } from '../countries'
import { flagUrl } from '../flags'
import { CloseIcon } from '../icons'
import { CARD_HEIGHT, CARD_WIDTH, WRAPPED_FONTS, drawWrapped } from './drawWrapped'
import { describeWrapped, wrappedOf } from './wrapped'
import type { YearReview } from './yearInReview'

type Props = {
  review: YearReview
  onClose: () => void
}

/** The places' flags as pictures to draw, those there are */
async function loadFlags(places: readonly CountryFeature[]) {
  const loaded = await Promise.all(
    places.map(async (country) => {
      const url = flagUrl(country)
      if (!url) return null
      const image = new Image()
      image.src = url
      try {
        await image.decode()
        return [country, image] as const
      } catch {
        return null
      }
    }),
  )
  return new Map(loaded.filter((entry) => entry !== null))
}

/** Whether this browser can share a picture, to other apps (on phones mostly) */
const canSharePictures = () => {
  try {
    return !!navigator.canShare?.({ files: [new File([], 'test.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/**
 * A year, wrapped: its card full screen, to save as a picture or share (on
 * a phone, straight to another app). Escape, or Close, puts it away.
 */
export default function WrappedView({ review, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrapped = useMemo(() => wrappedOf(review), [review])
  const [drawn, setDrawn] = useState(false)
  const [shareable] = useState(canSharePictures)
  const name = `meridian-${wrapped.year}-wrapped.png`

  useEffect(() => {
    let gone = false
    const draw = async () => {
      // The card's fonts, as text on a canvas doesn't wait for them
      await Promise.all(WRAPPED_FONTS.map((font) => document.fonts?.load(font).catch(() => [])))
      const flags = await loadFlags(wrapped.places.map((p) => p.country))
      const context = canvas.current?.getContext('2d')
      if (gone || !context) return
      drawWrapped(context, wrapped, flags)
      setDrawn(true)
    }
    void draw()
    return () => {
      gone = true
    }
  }, [wrapped])

  const picture = () =>
    new Promise<Blob | null>((done) => (canvas.current ? canvas.current.toBlob(done, 'image/png') : done(null)))
  const save = async () => {
    const blob = await picture()
    if (!blob) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }
  const share = async () => {
    const blob = await picture()
    if (!blob) return
    try {
      await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: `My ${wrapped.year} in travel` })
    } catch {
      // Not shared after all
    }
  }

  return (
    <div className="wrapped" role="dialog" aria-modal="true" aria-labelledby="wrapped-title">
      <h2 id="wrapped-title" className="sr-only">
        Your {wrapped.year}, wrapped
      </h2>
      <canvas
        ref={canvas}
        className="wrapped-card"
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        role="img"
        aria-label={describeWrapped(wrapped)}
      />
      <div className="wrapped-actions">
        {shareable && (
          <button type="button" className="primary-button" onClick={share} disabled={!drawn}>
            Share
          </button>
        )}
        <button type="button" className={`primary-button${shareable ? ' secondary' : ''}`} onClick={save} disabled={!drawn}>
          Save image
        </button>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close" autoFocus>
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
