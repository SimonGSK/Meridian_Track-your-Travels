import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshPhongMaterial } from 'three'
import { countries, type CountryFeature } from './countries'
import CountryPanel from './CountryPanel'

const COLORS = {
  land: 'rgba(72, 160, 120, 0.95)',
  hover: 'rgba(255, 200, 80, 1)',
  selected: 'rgba(255, 120, 70, 1)',
  side: 'rgba(20, 60, 50, 0.6)',
  stroke: 'rgba(10, 30, 25, 0.8)',
}

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
  const [hovered, setHovered] = useState<CountryFeature | null>(null)
  const [selected, setSelected] = useState<CountryFeature | null>(null)
  const { width, height } = useWindowSize()

  const globeMaterial = useMemo(
    () => new MeshPhongMaterial({ color: '#0b2a4a', shininess: 12 }),
    [],
  )

  // Slow idle spin until the user picks a country
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = !selected
    controls.autoRotateSpeed = 0.4
  }, [selected])

  const selectCountry = (country: CountryFeature | null) => {
    setSelected(country)
    if (country) {
      const [lng, lat] = country.properties.centroid
      globeRef.current?.pointOfView({ lat, lng, altitude: 1.8 }, 1000)
    }
  }

  const altitudeFor = (c: CountryFeature) =>
    c === selected ? 0.06 : c === hovered ? 0.03 : 0.008

  const colorFor = (c: CountryFeature) =>
    c === selected ? COLORS.selected : c === hovered ? COLORS.hover : COLORS.land

  return (
    <div className="app">
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="#02040a"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#5fb3ff"
        atmosphereAltitude={0.18}
        polygonsData={countries}
        polygonAltitude={(d) => altitudeFor(d as CountryFeature)}
        polygonCapColor={(d) => colorFor(d as CountryFeature)}
        polygonSideColor={() => COLORS.side}
        polygonStrokeColor={() => COLORS.stroke}
        polygonLabel={(d) => `<div class="tooltip">${(d as CountryFeature).properties.name}</div>`}
        polygonsTransitionDuration={250}
        onPolygonHover={(d) => {
          setHovered(d as CountryFeature | null)
          document.body.style.cursor = d ? 'pointer' : 'grab'
        }}
        onPolygonClick={(d) => selectCountry(d as CountryFeature)}
        onGlobeClick={() => selectCountry(null)}
        onGlobeReady={() => globeRef.current?.pointOfView({ lat: 25, lng: 10, altitude: 1.9 })}
      />

      <header className="title">
        <h1>Countries of the World</h1>
        <p>Drag to spin · scroll to zoom · click a country</p>
      </header>

      {selected && <CountryPanel country={selected} onClose={() => selectCountry(null)} />}
    </div>
  )
}
