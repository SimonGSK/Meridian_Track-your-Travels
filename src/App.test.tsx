import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { GlobeProps } from 'react-globe.gl'
import App from './App'
import { countries, findCountryAt } from './countries'
import { loadCities } from './data/cities'
import { loadRegions } from './data/regions'
import { DEFAULT_THEME, NIGHT, POLITICAL, visitedRegionColor } from './globe/themes'

// WebGL doesn't exist in jsdom, so the globe is replaced by a stand-in that
// exposes what the app passes to it. Screen positions map to places by x.
const { PLACES, PIN_AT, globe, layer, regionLayer, pinLayer, sceneObjects } = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>()
  const sceneObjects = new Set<object>()
  const controls = {
    autoRotate: false,
    autoRotateSpeed: 0,
    minDistance: 0,
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
      500: { lat: -10, lng: -52 }, // Brazil
      600: { lat: 36.2, lng: 138.25 }, // Japan
      700: { lat: 0, lng: 37.9 }, // Kenya
      800: { lat: 36.7, lng: -119.4 }, // California, United States
      // Not next to another place: neighboring pixels set how far a pixel is on the globe
      810: { lat: 31, lng: -99 }, // Texas, United States
      // anything else: outer space
    } as Record<number, { lat: number; lng: number }>,
    /** Where pins are, by x, when their city is pinned */
    PIN_AT: { 900: 'Copenhagen' } as Record<number, string>,
    globe: {
      controls: () => controls,
      pointOfView: vi.fn((..._args: unknown[]) => ({ lat: 25, lng: 10, altitude: 1.9 })),
      scene: () => ({ add: (o: object) => sceneObjects.add(o), remove: (o: object) => sceneObjects.delete(o) }),
      camera: () => ({ position: { length: () => 290 }, near: 0.05, updateProjectionMatrix: () => {} }),
      renderer: () => ({ domElement: document.createElement('canvas') }),
      getGlobeRadius: () => 100,
    },
    sceneObjects,
    layer: { object: {}, paint: vi.fn(), setBorders: vi.fn(), setMarkersVisible: vi.fn(), emphasize: vi.fn(), dispose: vi.fn() },
    regionLayer: { object: {}, show: vi.fn(), setOutlineColor: vi.fn(), dispose: vi.fn() },
    pinLayer: { object: {}, show: vi.fn(), setColor: vi.fn(), dispose: vi.fn() },
  }
})

vi.mock('react-globe.gl', () => ({
  default: function FakeGlobe({ ref, onGlobeReady }: GlobeProps & { ref: Ref<unknown> }) {
    useImperativeHandle(ref, () => globe)
    // Like the real globe, fires once after mounting
    const onReady = useRef(onGlobeReady)
    useEffect(() => onReady.current?.(), [])
    return <canvas />
  },
}))
vi.mock('./globe/picking', () => ({
  // x from 2000 to 2400 is a strip across the Caribbean, 0.02° per pixel, where neighboring pixels are neighboring places
  screenToLatLng: (_: unknown, x: number) =>
    PLACES[x] ?? (x >= 2000 && x < 2400 ? { lat: 12.3, lng: -64 + (x - 2000) * 0.02 } : null),
}))
vi.mock('./globe/regionLayer', () => ({ createRegionLayer: () => regionLayer }))
vi.mock('./globe/pinLayer', () => ({
  createPinLayer: () => pinLayer,
  pinAt: (_: unknown, pins: { city: { name: string } }[], { x }: { x: number }) =>
    pins.find((pin) => pin.city.name === PIN_AT[x]) ?? null,
}))
vi.mock('./globe/countryLayer', () => ({
  createCountryLayer: () => layer,
  createRaisedCountry: (country: { properties: { name: string } }) => ({
    object: { raised: country.properties.name, scale: { setScalar: () => {} } },
    setColor: () => {},
    dispose: () => {},
  }),
}))
// Games ask about a small, known set of countries in a fixed order
// Games ask about a small, known set of countries in a fixed order
const { lastRoundGame } = vi.hoisted(() => ({
  lastRoundGame: { current: null as import('./games/games').RoundGameState | null },
}))
vi.mock('./games/games', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./games/games')>()
  const { countries } = await import('./countries')
  const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(
    (name) => countries.find((c) => c.properties.name === name)!,
  )
  return {
    ...actual,
    newRoundGame: (id: import('./games/games').RoundGameId, difficulty: import('./games/games').Difficulty) =>
      (lastRoundGame.current = actual.newRoundGame(id, difficulty, () => 0.5, pool)),
  }
})
const PLACE_OF: Record<string, number> = { Denmark: 100, France: 200, Brazil: 500, Japan: 600, Kenya: 700 }

const at = (x: number) => ({ clientX: x, clientY: 0 })
const surface = () => screen.getByTestId('globe')
const hover = (x: number) => fireEvent.pointerMove(surface(), { ...at(x), pointerType: 'mouse' })
const click = (x: number) => {
  fireEvent.pointerDown(surface(), { ...at(x), button: 0 })
  fireEvent.pointerUp(surface(), at(x))
}
const tooltip = () => screen.queryByRole('tooltip')
const countryPanel = () => screen.queryByRole('complementary')
const panelHeading = () => countryPanel()?.querySelector('h2') ?? null
const sidePanel = () => screen.queryByRole('region')
/** Names of countries currently raised on the globe */
const raised = () => [...sceneObjects].flatMap((o) => ('raised' in o ? [o.raised as string] : []))
const flag = () => screen.queryByRole('img', { name: /^Flag of/ })

/** Countries currently not in the plain land color, replayed from paint() calls */
function painted() {
  const colors: Record<string, string> = {}
  for (const [country, color] of layer.paint.mock.calls) colors[country.properties.name] = color
  return Object.fromEntries(Object.entries(colors).filter(([, color]) => color !== DEFAULT_THEME.land))
}

const denmark = countries.find((c) => c.properties.name === 'Denmark')!

describe('App', () => {
  // The region shapes are big; load them once up front rather than inside the first test that needs them
  beforeAll(() => Promise.all([loadRegions(), loadCities()]), 20_000)

  beforeEach(() => {
    globe.pointOfView.mockClear()
    layer.paint.mockClear()
    layer.setBorders.mockClear()
    regionLayer.show.mockClear()
    pinLayer.show.mockClear()
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
      await waitFor(() => expect(painted()).toEqual({ Denmark: DEFAULT_THEME.hover }))
      expect(raised()).toEqual([])
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
      await waitFor(() => expect(painted()).toEqual({ France: DEFAULT_THEME.hover }))
      expect(flag()).toHaveAccessibleName('Flag of France')
    })

    it('shows nothing over the ocean or when leaving the globe', async () => {
      render(<App />)
      hover(100)
      await waitFor(() => expect(tooltip()).toBeVisible())
      hover(300)
      await waitFor(() => expect(tooltip()).not.toBeInTheDocument())
      await waitFor(() => expect(painted()).toEqual({}))
      expect(flag()).not.toBeInTheDocument()

      hover(100)
      await waitFor(() => expect(tooltip()).toBeVisible())
      fireEvent.pointerLeave(surface())
      await waitFor(() => expect(tooltip()).not.toBeInTheDocument())
      expect(surface()).toHaveStyle({ cursor: 'grab' })
    })

    it('forgives a near miss on a tiny island', async () => {
      const grenada = countries.find((c) => c.properties.name === 'Grenada')!
      const [lng] = grenada.properties.centroid
      // 7 pixels east of Grenada's marker (its ring is 12 px across), over the sea
      const x = 2000 + Math.round((lng + 64) / 0.02) + 7
      expect(findCountryAt(12.3, -64 + (x - 2000) * 0.02)).toBeNull()
      render(<App />)
      hover(x)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Grenada'))
      click(x)
      expect(panelHeading()).toHaveTextContent('Grenada')
    })

    it('does not reach islands too far from the pointer', async () => {
      render(<App />)
      hover(2000) // 64°W, open sea between the islands
      await act(() => new Promise((r) => setTimeout(r, 50)))
      expect(tooltip()).not.toBeInTheDocument()
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
      await waitFor(() => expect(painted()).toEqual({ France: DEFAULT_THEME.hover }))
      expect(raised()).toEqual(['Denmark'])
    })

    it('lowers the country again when it is deselected', () => {
      render(<App />)
      click(100)
      expect(raised()).toEqual(['Denmark'])
      click(300)
      expect(raised()).toEqual([])
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

  describe('menu', () => {
    it('opens a side panel and closes it again', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Visited' }))
      expect(sidePanel()).toHaveAccessibleName('Visited')
      await userEvent.click(within(sidePanel()!).getByRole('button', { name: 'Close panel' }))
      expect(sidePanel()).not.toBeInTheDocument()
    })

    it('switches between panels', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Visited' }))
      await userEvent.click(screen.getByRole('button', { name: 'Design' }))
      expect(sidePanel()).toHaveAccessibleName('Design')
    })

    it('closes the country panel first, then the side panel, on Escape', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Visited' }))
      click(100)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(countryPanel()).not.toBeInTheDocument()
      expect(sidePanel()).toBeInTheDocument()
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(sidePanel()).not.toBeInTheDocument()
    })
  })

  describe('visited countries', () => {
    it('marks the selected country as visited and colors it on the globe', async () => {
      render(<App />)
      click(100)
      await userEvent.click(within(countryPanel()!).getByRole('button', { name: 'Mark as visited' }))
      expect(painted()).toEqual({ Denmark: DEFAULT_THEME.visited })
      expect(within(countryPanel()!).getByRole('button', { name: 'Visited' })).toBeInTheDocument()

      await userEvent.click(within(countryPanel()!).getByRole('button', { name: 'Visited' }))
      expect(painted()).toEqual({})
    })

    it('adds countries from the Visited panel', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Visited' }))
      await userEvent.type(screen.getByRole('searchbox'), 'japan{Enter}')
      expect(within(sidePanel()!).getByRole('list', { name: 'Visited countries' })).toHaveTextContent('Japan')
      expect(painted()).toEqual({ Japan: DEFAULT_THEME.visited })
    })

    it('shows a visited country on the globe when picked from the list', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Visited' }))
      await userEvent.type(screen.getByRole('searchbox'), 'denmark{Enter}')
      await userEvent.click(within(sidePanel()!).getByRole('button', { name: 'Denmark' }))
      expect(panelHeading()).toHaveTextContent('Denmark')
      expect(globe.pointOfView).toHaveBeenLastCalledWith(expect.objectContaining({ altitude: 1.8 }), expect.any(Number))
    })

    it('remembers visited countries after a reload', async () => {
      const first = render(<App />)
      click(100)
      await userEvent.click(within(countryPanel()!).getByRole('button', { name: 'Mark as visited' }))
      first.unmount()
      layer.paint.mockClear()

      render(<App />)
      expect(painted()).toEqual({ Denmark: DEFAULT_THEME.visited })
    })
  })

  describe('visited states', () => {
    /** Regions last drawn on the globe, by name → color */
    const shownRegions = () => {
      const [fills] = regionLayer.show.mock.calls.at(-1) ?? [new Map()]
      return Object.fromEntries(
        [...(fills as Map<{ properties: { name: string } }, string>)].map(([r, color]) => [r.properties.name, color]),
      )
    }
    const openUnitedStates = async () => {
      render(<App />)
      click(800)
      await screen.findByText('of 51 visited')
    }

    it('lists the states of a selected country, which stays flat in the selected color', async () => {
      await openUnitedStates()
      expect(panelHeading()).toHaveTextContent('United States')
      expect(within(countryPanel()!).getByRole('checkbox', { name: 'California' })).not.toBeChecked()
      expect(raised()).toEqual([])
      expect(painted()['United States']).toBe(DEFAULT_THEME.selected)
    })

    it('marks a state clicked on the globe, and the country with it', async () => {
      await openUnitedStates()
      click(800)
      expect(within(countryPanel()!).getByRole('checkbox', { name: 'California' })).toBeChecked()
      expect(within(countryPanel()!).getByRole('button', { name: 'Visited' })).toHaveAttribute('aria-pressed', 'true')
      expect(shownRegions()).toEqual({ California: visitedRegionColor(DEFAULT_THEME) })
      click(800)
      expect(within(countryPanel()!).getByRole('checkbox', { name: 'California' })).not.toBeChecked()
    })

    it('marks states from the list', async () => {
      await openUnitedStates()
      await userEvent.click(within(countryPanel()!).getByRole('checkbox', { name: 'Texas' }))
      expect(shownRegions()).toEqual({ Texas: visitedRegionColor(DEFAULT_THEME) })
      expect(screen.getByText('of 51 visited')).toHaveTextContent('1 of 51 visited')
    })

    it('names and highlights the state pointed at', async () => {
      await openUnitedStates()
      hover(810)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Texas'))
      await waitFor(() => expect(shownRegions()).toEqual({ Texas: DEFAULT_THEME.hover }))
    })

    it('keeps showing visited states after closing the country, unless switched off', async () => {
      await openUnitedStates()
      click(800)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(shownRegions()).toEqual({ California: visitedRegionColor(DEFAULT_THEME) })

      await userEvent.click(screen.getByRole('button', { name: 'Explore' }))
      await userEvent.click(screen.getByRole('switch', { name: /Visited states/ }))
      expect(shownRegions()).toEqual({})
    })

    it('notes the states visited in the Visited list', async () => {
      await openUnitedStates()
      click(800)
      fireEvent.keyDown(window, { key: 'Escape' })
      await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Visited' }))
      expect(screen.getByRole('button', { name: /^United States/ })).toHaveTextContent('1 of 51 states')
    })

    it('hides states during games', async () => {
      await openUnitedStates()
      click(800)
      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      await userEvent.click(screen.getByRole('button', { name: /Flag quiz/ }))
      await userEvent.click(screen.getByRole('button', { name: /^Easy/ }))
      expect(shownRegions()).toEqual({})
    })
  })

  describe('visited cities', () => {
    /** Cities pinned on the globe last, with "(raised)" when on the raised, selected country */
    const pinned = () =>
      ((pinLayer.show.mock.calls.at(-1)?.[0] ?? []) as { city: { name: string }; raised: boolean }[]).map(
        ({ city, raised }) => city.name + (raised ? ' (raised)' : ''),
      )
    const city = (name: string | RegExp) => within(countryPanel()!).getByRole('checkbox', { name })
    const openDenmark = async () => {
      render(<App />)
      click(100)
      await within(countryPanel()!).findByRole('checkbox', { name: 'Aarhus' }) // once the cities have loaded
    }
    const tickAarhusAndClose = async () => {
      await openDenmark()
      await userEvent.click(city('Aarhus'))
      fireEvent.keyDown(window, { key: 'Escape' })
    }

    it('lists the cities of a selected country, capital first', async () => {
      await openDenmark()
      const names = within(countryPanel()!).getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)
      expect(names.slice(0, 2)).toEqual(['Copenhagencapital', 'Aarhus'])
    })

    it('marks a city, and its country with it, and pins it on the globe', async () => {
      await openDenmark()
      await userEvent.click(city('Aarhus'))
      expect(city('Aarhus')).toBeChecked()
      expect(within(countryPanel()!).getByRole('button', { name: 'Visited' })).toHaveAttribute('aria-pressed', 'true')
      expect(pinned()).toEqual(['Aarhus (raised)'])

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(pinned()).toEqual(['Aarhus'])
      expect(painted()).toEqual({ Denmark: DEFAULT_THEME.visited })
    })

    it('unpins a city ticked off again, keeping its country visited', async () => {
      await openDenmark()
      await userEvent.click(city('Aarhus'))
      await userEvent.click(city('Aarhus'))
      expect(pinned()).toEqual([])
      expect(within(countryPanel()!).getByRole('button', { name: 'Visited' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('marks the state a city is in', async () => {
      render(<App />)
      click(800)
      await screen.findByText('of 51 visited')
      await userEvent.click(city('Los Angeles'))
      expect(city('California')).toBeChecked()
      await userEvent.click(city('Los Angeles'))
      expect(city('California')).toBeChecked()
    })

    it("names the city of a pin pointed at, and shows its country's flag", async () => {
      await openDenmark()
      await userEvent.click(city(/^Copenhagen/))
      fireEvent.keyDown(window, { key: 'Escape' })
      hover(900)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Copenhagen'))
      expect(flag()).toHaveAccessibleName('Flag of Denmark')
    })

    it('opens the country of a pin clicked', async () => {
      await openDenmark()
      await userEvent.click(city(/^Copenhagen/))
      fireEvent.keyDown(window, { key: 'Escape' })
      click(900)
      expect(panelHeading()).toHaveTextContent('Denmark')
    })

    it('notes the cities visited in the Visited list', async () => {
      await tickAarhusAndClose()
      await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Visited' }))
      expect(screen.getByRole('button', { name: /^Denmark/ })).toHaveTextContent('1 city')
    })

    it('hides the pins when switched off, and during games', async () => {
      await tickAarhusAndClose()
      await userEvent.click(screen.getByRole('button', { name: 'Explore' }))
      await userEvent.click(screen.getByRole('switch', { name: /City pins/ }))
      expect(pinned()).toEqual([])
      await userEvent.click(screen.getByRole('switch', { name: /City pins/ }))
      expect(pinned()).toEqual(['Aarhus'])

      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      await userEvent.click(screen.getByRole('button', { name: /Flag quiz/ }))
      await userEvent.click(screen.getByRole('button', { name: /^Easy/ }))
      expect(pinned()).toEqual([])
    })

    it('remembers visited cities after a reload', async () => {
      const first = render(<App />)
      click(100)
      await userEvent.click(await within(countryPanel()!).findByRole('checkbox', { name: 'Aarhus' }))
      first.unmount()
      pinLayer.show.mockClear()

      render(<App />)
      await waitFor(() => expect(pinned()).toEqual(['Aarhus']))
    })
  })

  describe('explore settings', () => {
    const openExplore = () => userEvent.click(screen.getByRole('button', { name: 'Explore' }))

    it('hides visited countries on the globe, keeping the list', async () => {
      render(<App />)
      click(100)
      await userEvent.click(within(countryPanel()!).getByRole('button', { name: 'Mark as visited' }))
      expect(painted()).toEqual({ Denmark: DEFAULT_THEME.visited })

      await openExplore()
      await userEvent.click(screen.getByRole('switch', { name: /Visited countries/ }))
      expect(painted()).toEqual({})
      await userEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Visited' }))
      expect(screen.getByRole('list', { name: 'Visited countries' })).toHaveTextContent('Denmark')
    })

    it('hides the island markers, and remembers it', async () => {
      const first = render(<App />)
      expect(layer.setMarkersVisible).toHaveBeenLastCalledWith(true)
      await openExplore()
      await userEvent.click(screen.getByRole('switch', { name: /Island markers/ }))
      expect(layer.setMarkersVisible).toHaveBeenLastCalledWith(false)
      first.unmount()

      render(<App />)
      expect(layer.setMarkersVisible).toHaveBeenLastCalledWith(false)
    })
  })

  describe('design', () => {
    const lastColors = () => {
      const colors: Record<string, string> = {}
      for (const [country, color] of layer.paint.mock.calls) colors[country.properties.name] = color
      return colors
    }

    it('repaints the globe in the chosen design', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Design' }))
      await userEvent.click(screen.getByRole('button', { name: /Night/ }))
      expect(new Set(Object.values(lastColors()))).toEqual(new Set([NIGHT.land]))
      expect(layer.setBorders).toHaveBeenLastCalledWith(NIGHT.border, NIGHT.borderOpacity)
    })

    it('colors neighbors differently in the political design', async () => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Design' }))
      await userEvent.click(screen.getByRole('button', { name: /Political/ }))
      const colors = lastColors()
      expect(colors.Denmark).not.toBe(colors.Germany)
      expect(new Set(Object.values(colors))).toEqual(new Set(POLITICAL.land))
    })

    it('keeps the chosen design after a reload', async () => {
      const first = render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Design' }))
      await userEvent.click(screen.getByRole('button', { name: /Night/ }))
      first.unmount()
      layer.paint.mockClear()

      render(<App />)
      expect(new Set(Object.values(lastColors()))).toEqual(new Set([NIGHT.land]))
    })
  })

  describe('games', () => {
    const byName = (name: string) => countries.find((c) => c.properties.name === name)!
    const startGame = async (title: RegExp, difficulty = 'Easy') => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      await userEvent.click(screen.getByRole('button', { name: title }))
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${difficulty}`) }))
    }
    const findTarget = () => screen.getByText('Find this country on the globe').nextElementSibling!.textContent!
    const feedback = () => screen.getByRole('status')
    const lastFlight = () => globe.pointOfView.mock.calls.filter((call) => call.length === 2).at(-1)

    it('hides names and flags while playing', async () => {
      await startGame(/Find the country/)
      hover(100)
      await act(() => new Promise((r) => setTimeout(r, 50)))
      expect(tooltip()).not.toBeInTheDocument()
      expect(flag()).not.toBeInTheDocument()
    })

    it('does not show visited countries while playing', async () => {
      render(<App />)
      click(100)
      await userEvent.click(within(countryPanel()!).getByRole('button', { name: 'Mark as visited' }))
      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      await userEvent.click(screen.getByRole('button', { name: /Flag quiz/ }))
      await userEvent.click(screen.getByRole('button', { name: /^Easy/ }))
      expect(painted()).toEqual({})
    })

    describe('find the country', () => {
      it('scores 3 points for the right country on the first try', async () => {
        await startGame(/Find the country/)
        const target = findTarget()
        click(PLACE_OF[target])
        expect(feedback()).toHaveTextContent('Correct! +3 points')
        expect(screen.getByText('3 points')).toBeInTheDocument()
        expect(painted()).toEqual({ [target]: DEFAULT_THEME.correct })
        expect(countryPanel()).not.toBeInTheDocument()
      })

      it('lets you try again after a miss, for fewer points', async () => {
        await startGame(/Find the country/)
        const target = findTarget()
        const wrong = Object.keys(PLACE_OF).find((name) => name !== target)!
        click(PLACE_OF[wrong])
        expect(feedback()).toHaveTextContent(`That's ${wrong}. Try again: 2 tries left.`)
        expect(painted()).toEqual({ [wrong]: DEFAULT_THEME.wrong })
        click(PLACE_OF[target])
        expect(feedback()).toHaveTextContent('Correct! +2 points')
        expect(painted()).toEqual({ [wrong]: DEFAULT_THEME.wrong, [target]: DEFAULT_THEME.correct })
      })

      it('shows the answer and flies there after three misses', async () => {
        await startGame(/Find the country/)
        const target = findTarget()
        const wrong = Object.keys(PLACE_OF).filter((name) => name !== target).slice(0, 3)
        for (const name of wrong) click(PLACE_OF[name])
        expect(feedback()).toHaveTextContent(`The answer is ${target}.`)
        expect(painted()[target]).toBe(DEFAULT_THEME.correct)
        const [lng, lat] = byName(target).properties.centroid
        expect(lastFlight()?.[0]).toMatchObject({ lat, lng })
      })

      it('ignores clicks on the ocean and after answering', async () => {
        await startGame(/Find the country/)
        click(300)
        expect(feedback()).toBeEmptyDOMElement()
        const target = findTarget()
        click(PLACE_OF[target])
        click(PLACE_OF[Object.keys(PLACE_OF).find((name) => name !== target)!])
        expect(screen.getByText('3 points')).toBeInTheDocument()
      })

      it('plays to the end and saves the best score', async () => {
        await startGame(/Find the country/)
        for (let round = 0; round < 5; round++) {
          click(PLACE_OF[findTarget()])
          await userEvent.click(screen.getByRole('button', { name: round < 4 ? 'Next' : 'See results' }))
        }
        expect(screen.getByText('15 / 15')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'All games' }))
        await userEvent.click(screen.getByRole('button', { name: /Find the country/ }))
        expect(screen.getByRole('button', { name: /^Easy/ })).toHaveTextContent('Best: 15 / 30 points')
      })
    })

    describe('flag quiz', () => {
      it('checks the chosen country against the flag', async () => {
        await startGame(/Flag quiz/)
        const src = screen.getByRole('img', { name: 'The flag to identify' }).getAttribute('src')!
        const code = src.match(/\/(\w\w)\.svg/)![1].toUpperCase()
        const target = countries.find((c) => c.properties.isoAlpha2 === code)!.properties.name
        await userEvent.click(screen.getByRole('button', { name: target }))
        expect(feedback()).toHaveTextContent('Correct!')
        expect(painted()).toEqual({ [target]: DEFAULT_THEME.correct })
      })

      it('does not open the country panel when clicking the globe', async () => {
        await startGame(/Flag quiz/)
        click(100)
        expect(countryPanel()).not.toBeInTheDocument()
        expect(feedback()).toBeEmptyDOMElement()
      })
    })

    describe('name that country', () => {
      it('highlights the country in question and flies there, zoomed to fit', async () => {
        await startGame(/Name that country/)
        const highlighted = Object.entries(painted())
        expect(highlighted).toHaveLength(1)
        const [name, color] = highlighted[0]
        expect(color).toBe(DEFAULT_THEME.selected)
        const [lng, lat] = byName(name).properties.centroid
        expect(lastFlight()?.[0]).toMatchObject({ lat, lng })

        await userEvent.click(screen.getByRole('button', { name }))
        expect(feedback()).toHaveTextContent('Correct!')
        expect(painted()).toEqual({ [name]: DEFAULT_THEME.correct })
      })
    })

    describe('difficulty', () => {
      it('asks for typed answers on medium', async () => {
        await startGame(/Shape quiz/, 'Medium')
        const target = lastRoundGame.current!.rounds[0].target.properties.name
        await userEvent.type(screen.getByRole('textbox', { name: 'Your answer' }), `${target}{Enter}`)
        expect(feedback()).toHaveTextContent('Correct!')
        expect(painted()).toEqual({ [target]: DEFAULT_THEME.correct })
        const [lng, lat] = byName(target).properties.centroid
        expect(lastFlight()?.[0]).toMatchObject({ lat, lng })
      })

      it('plays again at the same difficulty', async () => {
        await startGame(/Shape quiz/, 'Medium')
        for (const [i, round] of lastRoundGame.current!.rounds.entries()) {
          await userEvent.type(screen.getByRole('textbox', { name: 'Your answer' }), `${round.target.properties.name}{Enter}`)
          await userEvent.click(screen.getByRole('button', { name: i < 4 ? 'Next' : 'See results' }))
        }
        await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
        expect(screen.getByText('Shape quiz · Medium')).toBeInTheDocument()
        expect(screen.getByText('Round 1 of 5')).toBeInTheDocument()
      })
    })

    describe('letter hunt', () => {
      const startLetter = async (letter: string) => {
        render(<App />)
        await userEvent.click(screen.getByRole('button', { name: 'Games' }))
        await userEvent.click(screen.getByRole('button', { name: /Letter hunt/ }))
        await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${letter}:`) }))
      }

      it('colors countries found and wrong clicks, and shows what was missed', async () => {
        await startLetter('D')
        expect(screen.getByText('Found 0 of 5')).toBeInTheDocument()

        click(PLACE_OF.Denmark)
        expect(screen.getByText('Found 1 of 5')).toBeInTheDocument()
        click(PLACE_OF.France)
        expect(feedback()).toHaveTextContent("France doesn't start with D.")
        expect(painted()).toEqual({ Denmark: DEFAULT_THEME.correct, France: DEFAULT_THEME.wrong })
        expect(countryPanel()).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Give up and show the rest' }))
        expect(screen.getByText(/Missed/)).toHaveTextContent('Djibouti')
        const colors = painted()
        expect(colors.Denmark).toBe(DEFAULT_THEME.correct)
        expect(colors.Djibouti).toBe(DEFAULT_THEME.selected)
      })

      it('saves the best for the letter and shows it on its tile', async () => {
        await startLetter('D')
        click(PLACE_OF.Denmark)
        await userEvent.click(screen.getByRole('button', { name: 'Give up and show the rest' }))
        await userEvent.click(screen.getByRole('button', { name: 'Another letter' }))
        expect(screen.getByRole('button', { name: /^D:/ })).toHaveTextContent('D1/5')
      })
    })

    describe('name them all', () => {
      it('lights up each country named, and shows the rest when giving up', async () => {
        render(<App />)
        await userEvent.click(screen.getByRole('button', { name: 'Games' }))
        await userEvent.click(screen.getByRole('button', { name: /Name them all/ }))
        await userEvent.click(screen.getByRole('button', { name: /^Europe/ }))
        const input = screen.getByRole('textbox', { name: 'Name a country' })
        await userEvent.type(input, 'Denmark{Enter}')
        await userEvent.type(input, 'Holland{Enter}')
        expect(screen.getByText('2 / 46')).toBeInTheDocument()
        expect(painted()).toEqual({ Denmark: DEFAULT_THEME.correct, Netherlands: DEFAULT_THEME.correct })

        await userEvent.type(input, 'Malta{Enter}')
        const [emphasized] = layer.emphasize.mock.lastCall!
        expect([...(emphasized as Map<{ properties: { name: string } }, string>)].map(([c]) => c.properties.name)).toContain('Malta')

        hover(200) // France: no name while playing, it would give answers away
        await act(() => new Promise((r) => setTimeout(r, 50)))
        expect(tooltip()).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Give up and show the rest' }))
        const colors = painted()
        expect(colors.Denmark).toBe(DEFAULT_THEME.correct)
        expect(colors.France).toBe(DEFAULT_THEME.selected)
        expect(colors.Japan).toBeUndefined() // not in Europe
      })
    })

    it('ends the game when the panel is closed', async () => {
      await startGame(/Name that country/)
      await userEvent.click(screen.getByRole('button', { name: 'Close panel' }))
      expect(painted()).toEqual({})
      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      expect(screen.getByRole('button', { name: /Name that country/ })).toBeInTheDocument()
    })
  })
})
