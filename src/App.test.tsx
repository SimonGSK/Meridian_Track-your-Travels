import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { GlobeProps } from 'react-globe.gl'
import App from './App'
import { countries } from './countries'
import { DEFAULT_THEME, NIGHT, POLITICAL } from './globe/themes'

// WebGL doesn't exist in jsdom, so the globe is replaced by a stand-in that
// exposes what the app passes to it. Screen positions map to places by x.
const { PLACES, globe, layer, sceneObjects } = vi.hoisted(() => {
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
      // anything else: outer space
    } as Record<number, { lat: number; lng: number }>,
    globe: {
      controls: () => controls,
      pointOfView: vi.fn((..._args: unknown[]) => ({ lat: 25, lng: 10, altitude: 1.9 })),
      scene: () => ({ add: (o: object) => sceneObjects.add(o), remove: (o: object) => sceneObjects.delete(o) }),
      camera: () => ({ position: { length: () => 290 }, near: 0.05, updateProjectionMatrix: () => {} }),
      renderer: () => ({ domElement: document.createElement('canvas') }),
      getGlobeRadius: () => 100,
    },
    sceneObjects,
    layer: { object: {}, paint: vi.fn(), setBorders: vi.fn(), dispose: vi.fn() },
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
  screenToLatLng: (_: unknown, x: number) => PLACES[x] ?? null,
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
vi.mock('./games/games', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./games/games')>()
  const { countries } = await import('./countries')
  const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(
    (name) => countries.find((c) => c.properties.name === name)!,
  )
  return { ...actual, newGame: (id: import('./games/games').GameId) => actual.newGame(id, () => 0.5, pool) }
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
  beforeEach(() => {
    globe.pointOfView.mockClear()
    layer.paint.mockClear()
    layer.setBorders.mockClear()
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
      expect(painted()).toEqual({ Denmark: DEFAULT_THEME.hover })
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
      expect(painted()).toEqual({ France: DEFAULT_THEME.hover })
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
    const startGame = async (title: RegExp) => {
      render(<App />)
      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      await userEvent.click(screen.getByRole('button', { name: title }))
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
      expect(painted()).toEqual({})
    })

    describe('find the country', () => {
      it('scores a click on the right country', async () => {
        await startGame(/Find the country/)
        const target = findTarget()
        click(PLACE_OF[target])
        expect(feedback()).toHaveTextContent('Correct!')
        expect(screen.getByText('Score 1')).toBeInTheDocument()
        expect(painted()).toEqual({ [target]: DEFAULT_THEME.correct })
        expect(countryPanel()).not.toBeInTheDocument()
      })

      it('shows the wrong and the right country after a miss, and flies to the answer', async () => {
        await startGame(/Find the country/)
        const target = findTarget()
        const wrong = Object.keys(PLACE_OF).find((name) => name !== target)!
        click(PLACE_OF[wrong])
        expect(feedback()).toHaveTextContent(`That's ${wrong}. The answer is ${target}.`)
        expect(painted()).toEqual({ [wrong]: DEFAULT_THEME.wrong, [target]: DEFAULT_THEME.correct })
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
        expect(screen.getByText('Score 1')).toBeInTheDocument()
      })

      it('plays to the end and saves the best score', async () => {
        await startGame(/Find the country/)
        for (let round = 0; round < 5; round++) {
          click(PLACE_OF[findTarget()])
          await userEvent.click(screen.getByRole('button', { name: round < 4 ? 'Next' : 'See results' }))
        }
        expect(screen.getByText('5 / 5')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'All games' }))
        expect(screen.getByRole('button', { name: /Find the country/ })).toHaveTextContent('Best: 5 / 10')
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

    it('ends the game when the panel is closed', async () => {
      await startGame(/Name that country/)
      await userEvent.click(screen.getByRole('button', { name: 'Close panel' }))
      expect(painted()).toEqual({})
      await userEvent.click(screen.getByRole('button', { name: 'Games' }))
      expect(screen.getByRole('button', { name: /Name that country/ })).toBeInTheDocument()
    })
  })
})
