import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import type { CountryFeature } from './countries'
import { findRegionAt, hasRegions, regionsLabel, regionsOf, type RegionFeature } from './data/regions'
import CountryPanel from './CountryPanel'
import DesignPanel from './design/DesignPanel'
import ExplorePanel from './explore/ExplorePanel'
import { useSettings } from './explore/useSettings'
import GamesPanel from './games/GamesPanel'
import type { Difficulty, RoundGameId } from './games/games'
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
import { regionFills, regionOutlines, regionProgress } from './visited/regionsView'
import Tooltip from './Tooltip'
import {
  useCountryLayer,
  useCountryPointer,
  useDepthPrecision,
  useRegionLayer,
  useRegions,
  useSelectedCountry,
  useSmoothAutoRotate,
} from './globe/hooks'
import { visitedRegionColor } from './globe/themes'
import type { LatLng } from './globe/interaction'
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
  const { game, best, previousBest, start: startGame, startLetter, pick, advance, quit: quitGame } = useGame()
  const playing = isPlaying(game)
  const globeIsAnswer = globeAnswers(game)
  const { width, height } = useWindowSize()
  const [theme, setTheme] = useTheme()
  const [settings, changeSettings] = useSettings()
  const regions = useRegions()
  const { visitedRegions, toggle: toggleRegionId } = useVisitedRegions()
  const [hoveredRegion, setHoveredRegion] = useState<RegionFeature | null>(null)

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
  useCountryLayer(globe, theme, colorOf, { showMarkers: settings.showMarkers })
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
  const regionAt = useCallback(
    (country: CountryFeature | null, position: LatLng | null) =>
      editing && country === editing && position ? findRegionAt(editingRegions, position.lat, position.lng) : null,
    [editing, editingRegions],
  )
  useDepthPrecision(globe)
  useSmoothAutoRotate(globe, !selected && !playing)

  const onGlobeClick = useCallback(
    (country: CountryFeature | null, position: LatLng | null) => {
      if (playing) {
        if (globeIsAnswer && country) pick(country)
        return
      }
      // Clicking a state of the country being edited marks it
      const region = regionAt(country, position)
      if (region && editing) toggleRegion(region, editing)
      else selectCountry(country)
    },
    [playing, globeIsAnswer, pick, regionAt, editing, toggleRegion, selectCountry],
  )
  const onGlobeHover = useCallback(
    (country: CountryFeature | null, position: LatLng | null) => {
      setHovered(country)
      setHoveredRegion(regionAt(country, position))
    },
    [regionAt],
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
              regionNote={(country) => {
                if (!regions || !hasRegions(country)) return null
                const { visited: count, total } = regionProgress(regions, visitedRegions, country)
                return count > 0 ? `${count} of ${total} ${regionsLabel(country).toLowerCase()}` : null
              }}
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
              onPick={pick}
              onNext={advance}
              onQuit={quitGame}
            />
          )}
        </SidePanel>
      )}

      {/* Names and flags would give away game answers */}
      <Tooltip text={playing ? null : (hoveredRegion?.properties.name ?? hovered?.properties.name ?? null)} />
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
        />
      )}
    </div>
  )
}
