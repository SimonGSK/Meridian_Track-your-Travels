/** A visual design for the globe. */
export type Theme = {
  id: string
  name: string
  description: string
  ocean: string
  oceanShininess: number
  /** One color for all land, or at least 5 so neighboring countries always differ */
  land: string | readonly string[]
  border: string
  borderOpacity: number
  hover: string
  selected: string
  selectedSide: string
  visited: string
  /** Game feedback */
  correct: string
  wrong: string
  background: string
  atmosphere: string
}

export const CLASSIC: Theme = {
  id: 'classic',
  name: 'Classic',
  description: 'Green land on a deep blue ocean',
  ocean: '#0b2a4a',
  oceanShininess: 12,
  land: '#48a078',
  border: '#0a1e19',
  borderOpacity: 0.8,
  hover: '#ffc850',
  selected: '#ff7846',
  selectedSide: 'rgba(20, 60, 50, 0.6)',
  visited: '#5b8def',
  correct: '#b4f25c',
  wrong: '#ff5a5f',
  background: '#02040a',
  atmosphere: '#5fb3ff',
}

export const POLITICAL: Theme = {
  id: 'political',
  name: 'Political',
  description: 'Like a school atlas: every neighbor in its own color',
  ocean: '#8ec3e6',
  oceanShininess: 6,
  land: ['#f3d58b', '#b9d98f', '#f2b39b', '#c3b1e1', '#94d2c4'],
  border: '#4a4a4a',
  borderOpacity: 0.55,
  hover: '#ff8a00',
  selected: '#e63946',
  selectedSide: 'rgba(90, 40, 40, 0.5)',
  visited: '#2f6fdb',
  correct: '#15803d',
  wrong: '#dc2626',
  background: '#050a14',
  atmosphere: '#bfe3ff',
}

export const NIGHT: Theme = {
  id: 'night',
  name: 'Night',
  description: 'Dark land with glowing neon borders',
  ocean: '#03060d',
  oceanShininess: 30,
  land: '#0d1b2a',
  border: '#38e1ff',
  borderOpacity: 0.9,
  hover: '#ff4fd8',
  selected: '#ffd166',
  selectedSide: 'rgba(56, 225, 255, 0.35)',
  visited: '#7b5cff',
  correct: '#39ff88',
  wrong: '#ff3b5c',
  background: '#000000',
  atmosphere: '#38e1ff',
}

export const VINTAGE: Theme = {
  id: 'vintage',
  name: 'Vintage',
  description: 'Parchment land on a faded sea, like an old map',
  ocean: '#9fb5a4',
  oceanShininess: 2,
  land: '#ead9b0',
  border: '#6b4f2a',
  borderOpacity: 0.7,
  hover: '#d9824b',
  selected: '#9c3d22',
  selectedSide: 'rgba(107, 79, 42, 0.6)',
  visited: '#5f8f6e',
  correct: '#2f7d3a',
  wrong: '#b83227',
  background: '#120d08',
  atmosphere: '#e8c78f',
}

export const MINIMAL: Theme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Quiet greys with crisp white borders',
  ocean: '#dfe6ee',
  oceanShininess: 4,
  land: '#aab6c3',
  border: '#ffffff',
  borderOpacity: 0.9,
  hover: '#1f2937',
  selected: '#2563eb',
  selectedSide: 'rgba(37, 99, 235, 0.4)',
  visited: '#0ea5a4',
  correct: '#16a34a',
  wrong: '#dc2626',
  background: '#0b0f14',
  atmosphere: '#ffffff',
}

export const THEMES: readonly Theme[] = [CLASSIC, POLITICAL, NIGHT, VINTAGE, MINIMAL]
export const DEFAULT_THEME = CLASSIC

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? DEFAULT_THEME

/** A country's plain land color in this design. */
export function landColor(theme: Theme, mapColor: number) {
  return typeof theme.land === 'string' ? theme.land : theme.land[mapColor % theme.land.length]
}
