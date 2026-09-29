import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import type { CountryFeature } from './countries'
import CountryPanel from './CountryPanel'
import Tooltip from './Tooltip'
import { useCountryLayer, useCountryPointer, useSmoothAutoRotate } from './globe/hooks'
import { INITIAL_VIEW, flightAltitude, flightDuration } from './globe/interaction'
import { COLORS, HOVER_ALTITUDE, SELECTED_ALTITUDE } from './globe/style'

const RENDERER_CONFIG = { antialias: true, alpha: true, powerPreference: 'high-performance' } as const

const sideColor = () => COLORS.side
const strokeColor = () => COLORS.border

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
  const { width, height } = useWindowSize()

  const globeMaterial = useMemo(() => new MeshPhongMaterial({ color: COLORS.ocean, shininess: 12 }), [])

  const selectCountry = useCallback(
    (country: CountryFeature | null) => {
      setSelected(country)
      if (!country || !globe) return
      const from = globe.pointOfView()
      const [lng, lat] = country.properties.centroid
      globe.pointOfView({ lat, lng, altitude: flightAltitude(from.altitude) }, flightDuration(from, { lat, lng }))
    },
    [globe],
  )

  useCountryLayer(globe)
  useSmoothAutoRotate(globe, !selected && !hovered)
  const pointerHandlers = useCountryPointer(globe, { onHover: setHovered, onClick: selectCountry })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && selectCountry(null)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectCountry])

  // Only hovered/selected countries go through the globe's polygon layer,
  // drawn raised on top of the flat merged country mesh.
  const raised = useMemo(
    () => [...new Set([selected, hovered])].filter((c): c is CountryFeature => c !== null),
    [selected, hovered],
  )
  const capColor = useCallback((c: object) => (c === selected ? COLORS.selected : COLORS.hover), [selected])
  const altitude = useCallback((c: object) => (c === selected ? SELECTED_ALTITUDE : HOVER_ALTITUDE), [selected])

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
          backgroundColor={COLORS.background}
          globeMaterial={globeMaterial}
          atmosphereColor={COLORS.atmosphere}
          atmosphereAltitude={0.18}
          // Picking happens in useCountryPointer, far cheaper than raycasting every mesh
          enablePointerInteraction={false}
          polygonsData={raised}
          polygonAltitude={altitude}
          polygonCapColor={capColor}
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

      <Tooltip text={hovered?.properties.name ?? null} />

      {selected && <CountryPanel country={selected} onClose={() => selectCountry(null)} />}
    </div>
  )
}
