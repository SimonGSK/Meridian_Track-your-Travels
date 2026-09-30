import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import type { CountryFeature } from './countries'
import CountryPanel from './CountryPanel'
import FlagCorner from './FlagCorner'
import NavRail from './nav/NavRail'
import { VIEWS, type ViewId } from './nav/views'
import SidePanel from './nav/SidePanel'
import VisitedPanel from './visited/VisitedPanel'
import { useVisited } from './visited/useVisited'
import Tooltip from './Tooltip'
import { useCountryLayer, useCountryPointer, useSmoothAutoRotate } from './globe/hooks'
import { INITIAL_VIEW, flightAltitude, flightDuration } from './globe/interaction'
import { countryColor } from './globe/colors'
import { SELECTED_ALTITUDE } from './globe/style'
import { DEFAULT_THEME } from './globe/themes'

const RENDERER_CONFIG = { antialias: true, alpha: true, powerPreference: 'high-performance' } as const

const NO_HIGHLIGHTS: ReadonlyMap<CountryFeature, string> = new Map()

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
  const { width, height } = useWindowSize()
  const theme = DEFAULT_THEME

  const globeMaterial = useMemo(
    () => new MeshPhongMaterial({ color: theme.ocean, shininess: theme.oceanShininess }),
    [theme],
  )
  useEffect(() => () => globeMaterial.dispose(), [globeMaterial])

  const flyTo = useCallback(
    (country: CountryFeature) => {
      if (!globe) return
      const from = globe.pointOfView()
      const [lng, lat] = country.properties.centroid
      globe.pointOfView({ lat, lng, altitude: flightAltitude(from.altitude) }, flightDuration(from, { lat, lng }))
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

  const colorOf = useCallback(
    (country: CountryFeature) =>
      countryColor(country, { theme, hovered, visited, highlights: NO_HIGHLIGHTS }),
    [theme, hovered, visited],
  )
  useCountryLayer(globe, theme, colorOf)
  useSmoothAutoRotate(globe, !selected && !hovered)
  const pointerHandlers = useCountryPointer(globe, { onHover: setHovered, onClick: selectCountry })

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
      else setView(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, selectCountry])

  // Hover is painted flat on the merged country mesh; only the selected
  // country goes through the globe's polygon layer, slightly raised.
  const raised = useMemo(() => (selected ? [selected] : []), [selected])
  const selectedColor = useCallback(() => theme.selected, [theme])
  const sideColor = useCallback(() => theme.selectedSide, [theme])
  const strokeColor = useCallback(() => theme.border, [theme])

  return (
    <div className="app">
      <div
        className="globe"
        data-testid="globe"
        aria-busy={!globe}
        style={{ cursor: hovered ? 'pointer' : 'grab' }}
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
          polygonsData={raised}
          polygonAltitude={SELECTED_ALTITUDE}
          polygonCapColor={selectedColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonsTransitionDuration={300}
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

      <NavRail view={view} onChange={setView} />
      {view && (
        <SidePanel title={VIEWS.find((v) => v.id === view)!.label} onClose={() => setView(null)}>
          {view === 'visited' && (
            <VisitedPanel visited={visited} onAdd={addVisited} onRemove={removeVisited} onShow={showCountry} />
          )}
          {view !== 'visited' && <p className="muted">Coming soon.</p>}
        </SidePanel>
      )}

      <Tooltip text={hovered?.properties.name ?? null} />
      <FlagCorner country={hovered} />

      {selected && (
        <CountryPanel
          country={selected}
          visited={visited.has(selected.properties.name)}
          onToggleVisited={() => toggleVisited(selected.properties.name)}
          onClose={() => selectCountry(null)}
        />
      )}
    </div>
  )
}
