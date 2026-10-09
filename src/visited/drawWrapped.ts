import { geoOrthographic, geoPath } from 'd3-geo'
import { countries, type CountryFeature } from '../countries'
import { MIDNIGHT, revisitColor } from '../globe/themes'
import type { Wrapped } from './wrapped'

/** The card's size: a phone's story, 9 by 16 */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

const SERIF = '"Fraunces Variable", Georgia, serif'
const SANS = '"Inter Variable", system-ui, sans-serif'
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace'

/** The fonts the card is drawn in, to have loaded before drawing it */
export const WRAPPED_FONTS = [`700 220px ${SERIF}`, `400 60px ${SERIF}`, `500 36px ${SANS}`, `500 28px ${MONO}`]

/** In the app's own colors, Midnight's, whatever design the globe is in */
const COLORS = {
  top: '#10243a',
  bottom: '#050b13',
  cream: '#efe7d8',
  muted: '#8296ab',
  label: '#7fa3c4',
  amber: '#e8a33d',
  ocean: MIDNIGHT.ocean,
  land: MIDNIGHT.land as string,
  border: MIDNIGHT.border,
  newPlace: MIDNIGHT.correct,
  again: revisitColor(MIDNIGHT),
  glow: 'rgba(59, 130, 200, 0.45)',
}

/** Flags: up to this many a row, and rows */
const FLAGS_A_ROW = 6
const FLAG_ROWS = 3
const FLAG = { width: 132, height: 99, gap: 20 }

type Ctx = CanvasRenderingContext2D

function text(ctx: Ctx, words: string, x: number, y: number, font: string, color: string, spacing = 0) {
  ctx.font = font
  ctx.fillStyle = color
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(words, x, y)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
}

function roundedRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius)
  else ctx.rect(x, y, width, height)
}

/** The world from above the year's places, those new that year green, those visited again a darker green */
function drawGlobe(ctx: Ctx, w: Wrapped, cx: number, cy: number, radius: number) {
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.28)
  glow.addColorStop(0, COLORS.glow)
  glow.addColorStop(1, 'rgba(59, 130, 200, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 1.28, 0, Math.PI * 2)
  ctx.fill()

  const projection = geoOrthographic().translate([cx, cy]).scale(radius).rotate([-w.view.lng, -w.view.lat]).clipAngle(90)
  const path = geoPath(projection, ctx)
  ctx.beginPath()
  path({ type: 'Sphere' })
  ctx.fillStyle = COLORS.ocean
  ctx.fill()

  const colors = new Map(w.places.map(({ country, isNew }) => [country, isNew ? COLORS.newPlace : COLORS.again]))
  for (const country of countries) {
    ctx.beginPath()
    path(country)
    ctx.fillStyle = colors.get(country) ?? COLORS.land
    ctx.fill()
  }
  ctx.beginPath()
  for (const country of countries) path(country)
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 1.2
  ctx.stroke()
}

/** The year's flags, new ones ringed in green, in rows in the middle of what's below `top`; more than fit end in "+12" */
function drawFlags(ctx: Ctx, w: Wrapped, flags: ReadonlyMap<CountryFeature, CanvasImageSource>, area: number) {
  const room = FLAGS_A_ROW * FLAG_ROWS
  const shown = w.places.length > room ? w.places.slice(0, room - 1) : w.places
  const more = w.places.length - shown.length
  const tiles = shown.length + (more ? 1 : 0)
  const rows = Math.ceil(tiles / FLAGS_A_ROW)
  const roomHeight = FLAG_ROWS * FLAG.height + (FLAG_ROWS - 1) * FLAG.gap
  const top = area + (roomHeight - (rows * FLAG.height + Math.max(rows - 1, 0) * FLAG.gap)) / 2
  for (let i = 0; i < tiles; i++) {
    const row = Math.floor(i / FLAGS_A_ROW)
    const inRow = Math.min(FLAGS_A_ROW, tiles - row * FLAGS_A_ROW)
    const rowWidth = inRow * FLAG.width + (inRow - 1) * FLAG.gap
    const x = (CARD_WIDTH - rowWidth) / 2 + (i % FLAGS_A_ROW) * (FLAG.width + FLAG.gap)
    const y = top + row * (FLAG.height + FLAG.gap)
    const place = shown[i]
    if (!place) {
      roundedRect(ctx, x, y, FLAG.width, FLAG.height, 10)
      ctx.fillStyle = COLORS.land
      ctx.fill()
      ctx.textAlign = 'center'
      text(ctx, `+${more}`, x + FLAG.width / 2, y + FLAG.height / 2 + 14, `600 40px ${SANS}`, COLORS.cream)
      continue
    }
    const image = flags.get(place.country)
    ctx.save()
    roundedRect(ctx, x, y, FLAG.width, FLAG.height, 10)
    ctx.clip()
    if (image) ctx.drawImage(image, x, y, FLAG.width, FLAG.height)
    else {
      ctx.fillStyle = COLORS.land
      ctx.fillRect(x, y, FLAG.width, FLAG.height)
    }
    ctx.restore()
    roundedRect(ctx, x, y, FLAG.width, FLAG.height, 10)
    ctx.lineWidth = place.isNew ? 6 : 2
    ctx.strokeStyle = place.isNew ? COLORS.newPlace : 'rgba(255, 255, 255, 0.18)'
    ctx.stroke()
  }
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
const km = (n: number) => `${Math.round(n).toLocaleString('en-US')} km`

/**
 * A year, wrapped, as a card to keep or share: the year, a globe of its
 * places, how many countries (and how many new) on how many continents, the
 * flags of its places, and its flights.
 */
export function drawWrapped(ctx: Ctx, w: Wrapped, flags: ReadonlyMap<CountryFeature, CanvasImageSource>) {
  const background = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT)
  background.addColorStop(0, COLORS.top)
  background.addColorStop(1, COLORS.bottom)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const middle = CARD_WIDTH / 2

  text(ctx, 'MERIDIAN', middle, 118, `500 28px ${MONO}`, COLORS.label, 10)
  text(ctx, 'Your', middle, 236, `400 60px ${SERIF}`, COLORS.muted)
  text(ctx, String(w.year), middle, 430, `700 220px ${SERIF}`, COLORS.cream)
  text(ctx, 'wrapped', middle, 510, `400 64px ${SERIF}`, COLORS.amber)
  if (w.mostTravelled) text(ctx, 'YOUR MOST TRAVELLED YEAR', middle, 570, `500 26px ${MONO}`, COLORS.amber, 6)

  drawGlobe(ctx, w, middle, 890, 280)

  const stats: [number, string][] = [
    [w.countries, plural(w.countries, 'COUNTRY', 'COUNTRIES')],
    [w.newPlaces, 'NEW'],
    [w.continents, plural(w.continents, 'CONTINENT', 'CONTINENTS')],
  ]
  stats.forEach(([value, label], i) => {
    const x = middle + (i - 1) * 330
    text(ctx, String(value), x, 1300, `700 112px ${SERIF}`, i === 1 ? COLORS.newPlace : COLORS.amber)
    text(ctx, label, x, 1350, `500 26px ${MONO}`, COLORS.muted, 5)
  })

  drawFlags(ctx, w, flags, 1400)
  ctx.textAlign = 'center'

  if (w.flights) {
    const laps = w.laps >= 0.1 ? ` · ${w.laps.toFixed(1)}× around the Earth` : ''
    text(ctx, `✈ ${w.flights} ${plural(w.flights, 'flight')} · ${km(w.km)}${laps}`, middle, 1805, `500 36px ${SANS}`, COLORS.cream)
    if (w.longest) {
      text(ctx, `Longest: ${w.longest.from} → ${w.longest.to} · ${km(w.longest.km)}`, middle, 1858, `400 30px ${SANS}`, COLORS.muted)
    }
  } else if (w.busiestMonth) {
    const n = w.busiestMonth.places
    text(ctx, `Busiest month: ${w.busiestMonth.name}, ${n} ${plural(n, 'place')}`, middle, 1830, `500 34px ${SANS}`, COLORS.cream)
  }
}
