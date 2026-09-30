/** A visual design for the globe. */
export type Theme = {
  id: string
  name: string
  description: string
  ocean: string
  oceanShininess: number
  land: string
  border: string
  borderOpacity: number
  hover: string
  selected: string
  selectedSide: string
  visited: string
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
  background: '#02040a',
  atmosphere: '#5fb3ff',
}

export const THEMES: readonly Theme[] = [CLASSIC]
export const DEFAULT_THEME = CLASSIC
