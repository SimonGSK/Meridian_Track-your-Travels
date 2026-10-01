import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import type { CountryFeature } from './countries'
import { citiesLabel, citiesOf, countryOfCity, type City } from './data/cities'
import { findRegionAt, hasRegions, regionsLabel, regionsOf, type RegionFeature } from './data/regions'
import CountryPanel from './CountryPanel'
import DesignPanel from './design/DesignPanel'
import ExplorePanel from './explore/ExplorePanel'
import { useSettings } from './explore/useSettings'
import GamesPanel from './games/GamesPanel'
import type { Difficulty, RoundGameId } from './games/games'
import type { Scope } from './games/allGame'
import { flightTarget, gameHighlights, globeAnswers, isPlaying, overviewKey, showsGame } from './games/globeView'
import { useGame } from './games/useGame'
import { useTheme } from './design/useTheme'
import FlagCorner from './FlagCorner'
import NavRail from './nav/NavRail'
import { VIEWS, type ViewId } from './nav/views'
import SidePanel from './nav/SidePanel'
import VisitedPanel from './visited/VisitedPanel'
import { useVisited } from './visited/useVisited'
import { useVisitedRegions } from './visited/useVisitedRegions'
import { useVisitedCities } from './visited/useVisitedCities'
import { regionFills, regionOutlines, regionProgress } from './visited/regionsView'
import Tooltip from './Tooltip'
import {
  useCities,
  useCountryLayer,
  useCountryPointer,
  useDepthPrecision,
  usePinLayer,
  useRegionLayer,
  useRegions,
  useSelectedCountry,
  useSmoothAutoRotate,
} from './globe/hooks'
import { pinAt } from './globe/pinLayer'
import { visitedRegionColor } from './globe/themes'
import type { LatLng, Point } from './globe/interaction'
import { INITIAL_VIEW, fitAltitude, flightAltitude, flightDuration } from './globe/interaction'
import { countryColor } from './globe/colors'

const RENDERER_CONFIG = { antialias: true, alpha: true, powerPreference: 'high-performance' } as const

const NO_VISITS: ReadonlySet<string> = new Set()

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export default function App() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [globe, setGlobe] = useState<GlobeMethods | null>(null)
  const [hovered, setHovered] = useState<CountryFeature | null>(null)
  const [selected, setSelected] = useState<CountryFeature | null>(null)
  const [view, setView] = useState<ViewId | null>(null)
  const { visited, add: addVisited, remove: removeVisited, toggle: toggleVisited } = useVisited()
  const { game, best, previousBest, start: startGame, startLetter, startAll, pick, advance, stop, quit: quitGame } =
    useGame()
  const playing = isPlaying(game)
  const globeIsAnswer = globeAnswers(game)
  const { width, height } = useWindowSize()
  const [theme, setTheme] = useTheme()
  const [settings, changeSettings] = useSettings()
  const regions = useRegions()
  const { visitedRegions, toggle: toggleRegionId, add: addRegionId } = useVisitedRegions()
  const [hoveredRegion, setHoveredRegion] = useState<RegionFeature | null>(null)
  const cities = useCities()
  const { visitedCities, toggle: toggleCityId } = useVisitedCities()
  const [hoveredCity, setHoveredCity] = useState<City | null>(null)

  const globeMaterial = useMemo(
    () => new MeshPhongMaterial({ color: theme.ocean, shininess: theme.oceanShininess }),
    [theme],
  )
  useEffect(() => () => globeMaterial.dispose(), [globeMaterial])

  /** Keeps the user's zoom by default; `fit` zooms to the country's size instead. */
  const flyTo = useCallback(
    (country: CountryFeature, { fit = false } = {}) => {
      if (!globe) return
      const from = globe.pointOfView()
      const [lng, lat] = country.properties.centroid
      const altitude = fit ? fitAltitude(country.properties.extent) : flightAltitude(from.altitude)
      globe.pointOfView({ lat, lng, altitude }, flightDuration(from, { lat, lng }))
    },
    [globe],
  )

  const selectCountry = useCallback(
    (country: CountryFeature | null) => {
      setSelected(country)
      if (country) flyTo(country)
    },
    [flyTo],
  )

  // A selected country with states isn't raised: it stays flat so its states can be picked on the globe
  const editing = !playing && selected && hasRegions(selected) ? selected : null
  const editingRegions = useMemo(() => (editing && regions ? regionsOf(regions, editing) : []), [editing, regions])

  const selectedCities = useMemo(() => (selected && cities ? citiesOf(cities, selected) : []), [selected, cities])

  const highlights = useMemo(() => {
    const colors = gameHighlights(game, theme)
    return editing ? new Map([...colors, [editing, theme.selected]]) : colors
  }, [game, theme, editing])

  // Games get a clean globe: no visited colors, and hover only where the globe is the answer
  const colorHovered = !playing || globeIsAnswer ? hovered : null
  const colorVisited = showsGame(game) || !settings.showVisited ? NO_VISITS : visited
  const colorOf = useCallback(
    (country: CountryFeature) =>
      countryColor(country, { theme, hovered: colorHovered, visited: colorVisited, highlights }),
    [theme, colorHovered, colorVisited, highlights],
  )
  // Game answers on tiny islands get a dot, or they'd be invisible
  const gameColors = useMemo(() => gameHighlights(game, theme), [game, theme])
  useCountryLayer(globe, theme, colorOf, { showMarkers: settings.showMarkers, emphasized: gameColors })
  useSelectedCountry(globe, editing ? null : selected, theme.selected)

  const fills = useMemo(
    () =>
      regions && !showsGame(game)
        ? regionFills({
            regions,
            visitedRegions,
            isShownCountry: (c) => settings.showRegions && visited.has(c.properties.name),
            editing,
            hovered: hoveredRegion,
            color: visitedRegionColor(theme),
            hoverColor: theme.hover,
          })
        : new Map<RegionFeature, string>(),
    [regions, game, visitedRegions, settings.showRegions, visited, editing, hoveredRegion, theme],
  )
  const outlines = useMemo(() => (regions ? regionOutlines(regions, fills, editing) : []), [regions, fills, editing])
  useRegionLayer(globe, regions, fills, outlines, theme)

  /** Mark or unmark a state; marking one also marks its country as visited */
  const toggleRegion = useCallback(
    (region: RegionFeature, country: CountryFeature) => {
      if (!visitedRegions.has(region.properties.id) && !visited.has(country.properties.name)) {
        addVisited(country.properties.name)
      }
      toggleRegionId(region.properties.id)
    },
    [visitedRegions, visited, addVisited, toggleRegionId],
  )
  /** Mark or unmark a city; marking one also marks its country, and its state, as visited */
  const toggleCity = useCallback(
    (city: City, country: CountryFeature) => {
      if (!visitedCities.has(city.id)) {
        if (!visited.has(country.properties.name)) addVisited(country.properties.name)
        const region = regions && hasRegions(country) ? findRegionAt(regionsOf(regions, country), city.lat, city.lng) : null
        if (region) addRegionId(region.properties.id)
      }
      toggleCityId(city.id)
    },
    [visitedCities, visited, addVisited, regions, addRegionId, toggleCityId],
  )

  // A pin on each visited city, standing on the selected country when it's raised
  const pinned = useMemo(
    () =>
      cities && settings.showCities && !showsGame(game)
        ? cities
            .filter((c) => visitedCities.has(c.id))
            .map((city) => ({ city, lat: city.lat, lng: city.lng, raised: !editing && countryOfCity(city) === selected }))
        : [],
    [cities, settings.showCities, game, visitedCities, editing, selected],
  )
  usePinLayer(globe, pinned, theme.pin)
  const cityAt = useCallback(
    (point: Point | null) => (globe && point && pinned.length > 0 ? (pinAt(globe, pinned, point)?.city ?? null) : null),
    [globe, pinned],
  )

  const regionAt = useCallback(
    (country: CountryFeature | null, position: LatLng | null) =>
      editing && country === editing && position ? findRegionAt(editingRegions, position.lat, position.lng) : null,
    [editing, editingRegions],
  )
  useDepthPrecision(globe)
  useSmoothAutoRotate(globe, !selected && !playing)

  const onGlobeClick = useCallback(
    (country: CountryFeature | null, position: LatLng | null, point: Point) => {
      if (playing) {
        if (globeIsAnswer && country) pick(country)
        return
      }
      // A pin stands for its city's country
      const city = cityAt(point)
      if (city) return selectCountry(countryOfCity(city))
      // Clicking a state of the country being edited marks it
      const region = regionAt(country, position)
      if (region && editing) toggleRegion(region, editing)
      else selectCountry(country)
    },
    [playing, globeIsAnswer, pick, cityAt, regionAt, editing, toggleRegion, selectCountry],
  )
  const onGlobeHover = useCallback(
    (country: CountryFeature | null, position: LatLng | null, point: Point | null) => {
      const city = cityAt(point)
      setHoveredCity(city)
      setHovered(city ? countryOfCity(city) : country)
      setHoveredRegion(city ? null : regionAt(country, position))
    },
    [cityAt, regionAt],
  )
  const pointerHandlers = useCountryPointer(globe, {
    onHover: onGlobeHover,
    onClick: onGlobeClick,
    markers: settings.showMarkers,
  })

  const gameFlight = flightTarget(game)
  useEffect(() => {
    if (gameFlight) flyTo(gameFlight, { fit: true })
  }, [gameFlight, flyTo])

  // Searching the globe starts from an overview, not zoomed in on the last answer
  const overview = overviewKey(game)
  useEffect(() => {
    if (overview !== null) globe?.pointOfView({ altitude: INITIAL_VIEW.altitude }, 800)
  }, [overview, globe])

  const playGame = (id: RoundGameId, difficulty: Difficulty) => {
    selectCountry(null)
    startGame(id, difficulty)
  }
  const playLetter = (letter: string) => {
    selectCountry(null)
    startLetter(letter)
  }
  const playAll = (scope: Scope) => {
    selectCountry(null)
    startAll(scope)
  }

  // Leaving the Games panel ends the game
  const changeView = (next: ViewId | null) => {
    if (view === 'games' && next !== 'games') quitGame()
    setView(next)
  }

  // From a list in the side panel. On phones the panel covers the country panel, so close it.
  const showCountry = useCallback(
    (country: CountryFeature) => {
      selectCountry(country)
      if (window.matchMedia?.('(max-width: 600px)').matches) setView(null)
    },
    [selectCountry],
  )

  // Escape closes the country panel first, then the side panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selected) selectCountry(null)
      else {
        quitGame()
        setView(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, selectCountry, quitGame])


  return (
    <div className={`app${view ? ' panel-open' : ''}`}>
      <div
        className="globe"
        data-testid="globe"
        aria-busy={!globe}
        style={{ cursor: hovered && (!playing || globeIsAnswer) ? 'pointer' : 'grab' }}
        {...pointerHandlers}
      >
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          rendererConfig={RENDERER_CONFIG}
          backgroundColor={theme.background}
          globeMaterial={globeMaterial}
          atmosphereColor={theme.atmosphere}
          atmosphereAltitude={0.18}
          // Picking happens in useCountryPointer, far cheaper than raycasting every mesh
          enablePointerInteraction={false}
          onGlobeReady={() => {
            globeRef.current?.pointOfView(INITIAL_VIEW)
            setGlobe(globeRef.current ?? null)
          }}
        />
      </div>

      <header className="title">
        <h1>Countries of the World</h1>
        <p>Drag to spin · scroll to zoom · click a country</p>
      </header>

      <NavRail view={view} onChange={changeView} />
      {view && (
        <SidePanel title={VIEWS.find((v) => v.id === view)!.label} onClose={() => changeView(null)}>
          {view === 'explore' && <ExplorePanel settings={settings} onChange={changeSettings} />}
          {view === 'visited' && (
            <VisitedPanel
              visited={visited}
              onAdd={addVisited}
              onRemove={removeVisited}
              onShow={showCountry}
              note={(country) => {
                const notes = []
                if (regions && hasRegions(country)) {
                  const { visited: count, total } = regionProgress(regions, visitedRegions, country)
                  if (count > 0) notes.push(`${count} of ${total} ${regionsLabel(country).toLowerCase()}`)
                }
                const cityCount = cities ? citiesOf(cities, country).filter((c) => visitedCities.has(c.id)).length : 0
                if (cityCount > 0) notes.push(citiesLabel(cityCount))
                return notes.join(' · ') || null
              }}
              cityCount={cities ? cities.filter((c) => visitedCities.has(c.id)).length : 0}
            />
          )}
          {view === 'design' && <DesignPanel theme={theme} onChange={setTheme} />}
          {view === 'games' && (
            <GamesPanel
              game={game}
              best={best}
              previousBest={previousBest}
              onStart={playGame}
              onStartLetter={playLetter}
              onStartAll={playAll}
              onPick={pick}
              onNext={advance}
              onStop={stop}
              onQuit={quitGame}
            />
          )}
        </SidePanel>
      )}

      {/* Names and flags would give away game answers */}
      <Tooltip
        text={playing ? null : (hoveredCity?.name ?? hoveredRegion?.properties.name ?? hovered?.properties.name ?? null)}
      />
      <FlagCorner country={playing ? null : hovered} />

      {selected && (
        <CountryPanel
          country={selected}
          visited={visited.has(selected.properties.name)}
          onToggleVisited={() => toggleVisited(selected.properties.name)}
          onClose={() => selectCountry(null)}
          regions={
            editing
              ? {
                  regions: regions && editingRegions,
                  label: regionsLabel(editing),
                  visited: visitedRegions,
                  onToggle: (region) => toggleRegion(region, editing),
                }
              : undefined
          }
          cities={
            selectedCities.length > 0 || !cities
              ? {
                  cities: cities && selectedCities,
                  visited: visitedCities,
                  onToggle: (city) => toggleCity(city, selected),
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
