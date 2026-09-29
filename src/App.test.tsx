import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { GlobeProps } from 'react-globe.gl'
import App from './App'
import { countries } from './countries'
import { COLORS } from './globe/style'

// WebGL doesn't exist in jsdom, so the globe is replaced by a stand-in that
// exposes what the app passes to it. Screen positions map to places by x.
const { PLACES, globe, layer } = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>()
  const controls = {
    autoRotate: false,
    autoRotateSpeed: 0,
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    },
    removeEventListener: (type: string, fn: () => void) => listeners.get(type)?.delete(fn),
  }
  return {
    PLACES: {
      100: { lat: 56.17, lng: 9.55 }, // Denmark
      200: { lat: 46.6, lng: 2.4 }, // France
      300: { lat: 30, lng: -40 }, // Atlantic Ocean
      400: { lat: 9.56, lng: 44.06 }, // Somaliland, which has no flag
      // anything else: outer space
    } as Record<number, { lat: number; lng: number }>,
    globe: {
      controls: () => controls,
      pointOfView: vi.fn((..._args: unknown[]) => ({ lat: 25, lng: 10, altitude: 1.9 })),
      scene: () => ({ add: vi.fn(), remove: vi.fn() }),
      getGlobeRadius: () => 100,
    },
    layer: { object: {}, paint: vi.fn(), dispose: vi.fn() },
  }
})

vi.mock('react-globe.gl', () => ({
  default: function FakeGlobe({ ref, onGlobeReady, polygonsData }: GlobeProps & { ref: Ref<unknown> }) {
    useImperativeHandle(ref, () => globe)
    // Like the real globe, fires once after mounting
    const onReady = useRef(onGlobeReady)
    useEffect(() => onReady.current?.(), [])
    const raised = (polygonsData ?? []) as typeof countries
    return (
      <ul aria-label="raised countries">
        {raised.map((c) => (
          <li key={c.properties.name}>{c.properties.name}</li>
        ))}
      </ul>
    )
  },
}))
vi.mock('./globe/picking', () => ({
  screenToLatLng: (_: unknown, x: number) => PLACES[x] ?? null,
}))
vi.mock('./globe/countryLayer', () => ({ createCountryLayer: () => layer }))

const at = (x: number) => ({ clientX: x, clientY: 0 })
const surface = () => screen.getByTestId('globe')
const hover = (x: number) => fireEvent.pointerMove(surface(), { ...at(x), pointerType: 'mouse' })
const click = (x: number) => {
  fireEvent.pointerDown(surface(), { ...at(x), button: 0 })
  fireEvent.pointerUp(surface(), at(x))
}
const tooltip = () => screen.queryByRole('tooltip')
const panelHeading = () => screen.queryByRole('heading', { level: 2 })
const raised = () => screen.getByRole('list', { name: 'raised countries' })
const flag = () => screen.queryByRole('img', { name: /^Flag of/ })

/** Countries currently recolored on the merged mesh, replayed from paint() calls */
function painted() {
  const colors: Record<string, string> = {}
  for (const [country, color] of layer.paint.mock.calls) {
    if (color) colors[country.properties.name] = color
    else delete colors[country.properties.name]
  }
  return colors
}

const denmark = countries.find((c) => c.properties.name === 'Denmark')!

describe('App', () => {
  beforeEach(() => {
    globe.pointOfView.mockClear()
    layer.paint.mockClear()
  })

  it('shows the title and how to use the globe', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Countries of the World' })).toBeInTheDocument()
    expect(screen.getByText(/click a country/)).toBeInTheDocument()
  })

  it('starts from the initial view', () => {
    render(<App />)
    expect(globe.pointOfView).toHaveBeenCalledWith({ lat: 25, lng: 10, altitude: 1.9 })
  })

  describe('hovering', () => {
    it('shows the country name and colors it without raising it', async () => {
      render(<App />)
      hover(100)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Denmark'))
      expect(painted()).toEqual({ Denmark: COLORS.hover })
      expect(raised()).toBeEmptyDOMElement()
      expect(surface()).toHaveStyle({ cursor: 'pointer' })
    })

    it("shows the country's flag", async () => {
      render(<App />)
      expect(flag()).not.toBeInTheDocument()
      hover(100)
      await waitFor(() => expect(flag()).toHaveAccessibleName('Flag of Denmark'))
      expect(flag()).toHaveAttribute('src', expect.stringMatching(/dk\.svg/))
    })

    it('shows no flag for places without one', async () => {
      render(<App />)
      hover(400)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Somaliland'))
      expect(flag()).not.toBeInTheDocument()
    })

    it('follows the pointer from country to country', async () => {
      render(<App />)
      hover(100)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Denmark'))
      hover(200)
      await waitFor(() => expect(tooltip()).toHaveTextContent('France'))
      expect(painted()).toEqual({ France: COLORS.hover })
      expect(flag()).toHaveAccessibleName('Flag of France')
    })

    it('shows nothing over the ocean or when leaving the globe', async () => {
      render(<App />)
      hover(100)
      await waitFor(() => expect(tooltip()).toBeVisible())
      hover(300)
      await waitFor(() => expect(tooltip()).not.toBeInTheDocument())
      expect(painted()).toEqual({})
      expect(flag()).not.toBeInTheDocument()

      hover(100)
      await waitFor(() => expect(tooltip()).toBeVisible())
      fireEvent.pointerLeave(surface())
      await waitFor(() => expect(tooltip()).not.toBeInTheDocument())
      expect(surface()).toHaveStyle({ cursor: 'grab' })
    })

    it('ignores touch, which has no hover', async () => {
      render(<App />)
      fireEvent.pointerMove(surface(), { ...at(100), pointerType: 'touch' })
      await act(() => new Promise((r) => setTimeout(r, 50)))
      expect(tooltip()).not.toBeInTheDocument()
    })
  })

  describe('clicking', () => {
    it('opens the panel for the clicked country', () => {
      render(<App />)
      click(100)
      expect(panelHeading()).toHaveTextContent('Denmark')
    })

    it('flies the camera to the country', () => {
      render(<App />)
      click(100)
      const [lng, lat] = denmark.properties.centroid
      expect(globe.pointOfView).toHaveBeenLastCalledWith(
        { lat, lng, altitude: 1.8 },
        expect.any(Number),
      )
    })

    it('raises only the selected country, not the hovered one', async () => {
      render(<App />)
      click(100)
      hover(200)
      await waitFor(() => expect(painted()).toEqual({ France: COLORS.hover }))
      expect(raised()).toHaveTextContent('Denmark')
      expect(raised()).not.toHaveTextContent('France')
    })

    it('switches to another country', () => {
      render(<App />)
      click(100)
      click(200)
      expect(panelHeading()).toHaveTextContent('France')
    })

    it('does not select anything when dragging to spin the globe', () => {
      render(<App />)
      fireEvent.pointerDown(surface(), { ...at(100), button: 0 })
      fireEvent.pointerUp(surface(), at(200))
      expect(panelHeading()).not.toBeInTheDocument()
      expect(globe.pointOfView).not.toHaveBeenCalledWith(expect.anything(), expect.any(Number))
    })

    it('ignores right clicks', () => {
      render(<App />)
      fireEvent.pointerDown(surface(), { ...at(100), button: 2 })
      fireEvent.pointerUp(surface(), at(100))
      expect(panelHeading()).not.toBeInTheDocument()
    })
  })

  describe('closing the panel', () => {
    it.each([
      ['clicking the ocean', () => click(300)],
      ['clicking outer space', () => click(999)],
      ['the close button', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
      ['pressing Escape', () => fireEvent.keyDown(window, { key: 'Escape' })],
    ])('closes on %s', (_, close) => {
      render(<App />)
      click(100)
      expect(panelHeading()).toBeInTheDocument()
      act(close)
      expect(panelHeading()).not.toBeInTheDocument()
    })
  })
})
