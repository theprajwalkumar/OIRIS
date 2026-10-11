import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, LayerGroup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Layers, ChevronDown, MapPin } from 'lucide-react'
import { useEvents } from '../../context/EventContext.jsx'
import { useMapLayers } from '../../context/MapLayerContext.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { MAP_LEGEND } from '../../utils/constants.js'
import { sevColor, Dot } from './ui.jsx'
import MapCanvas from '../MapCanvas.jsx'
import StaticGeoLayer from '../StaticGeoLayer.jsx'
import LiveFlightsLayer from '../LiveFlightsLayer.jsx'
import Map3D from '../Map3D.jsx'

const DASHBOARD_LAYERS = [
  { id: 'intel-hotspots', label: 'Intel Hotspots' },
  { id: 'tension-heatmap', label: 'Conflict Zones' },
  { id: 'military-bases', label: 'Military Bases' },
  { id: 'nuclear-sites', label: 'Nuclear Sites' },
  { id: 'gamma-irradiators', label: 'Gamma Irradiators' },
  { id: 'radiation-watch', label: 'Radiation Watch' },
  { id: 'spaceports', label: 'Spaceports' },
  { id: 'submarine-cables', label: 'Undersea Cables' },
  { id: 'pipelines', label: 'Pipelines' }
]

const MapBinding = () => {
  const map = useMap()
  const { mapRef, setCenter, setZoom } = useUI()
  useMapEvents({
    moveend: (e) => {
      const m = e.target
      setCenter(m.getCenter())
      setZoom(m.getZoom())
    }
  })
  useEffect(() => {
    if (mapRef && map) mapRef.current = map
    const raf = requestAnimationFrame(() => map.invalidateSize())
    const t1 = setTimeout(() => map.invalidateSize(), 250)
    const t2 = setTimeout(() => map.invalidateSize(), 800)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', onResize)
    }
  }, [map, mapRef])
  return null
}

const SeverityMarkers = () => {
  const map = useMap()
  const { events } = useEvents()
  const groupRef = useRef(null)

  useEffect(() => {
    if (!map) return
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    return () => { map.removeLayer(group) }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    let count = 0
    for (const e of events.values()) {
      if (count >= 250) break
      if (e.geo === false || e.lat == null || e.lng == null) continue
      if (e.severity !== 'critical' && e.severity !== 'high') continue
      const color = sevColor(e.severity)
      const size = e.severity === 'critical' ? 12 : 9
      const icon = L.divIcon({
        className: 'sev-marker',
        html: `<div class="sev-pulse" style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 10px ${color},0 0 4px ${color}"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      })
      L.marker([e.lat, e.lng], { icon })
        .bindTooltip(`${e.title} · ${(e.category || '').toUpperCase()}`, { className: 'custom-tooltip', sticky: true })
        .addTo(group)
      count++
    }
  }, [events])

  return null
}

const GlobalMapPanel = () => {
  const { toggleLayer, isLayerActive } = useMapLayers()
  const { mapMode } = useUI()
  const [open, setOpen] = useState(true)
  const center = useMemo(() => [20, 0], [])

  return (
    <div className="relative rounded-md overflow-hidden border border-[var(--color-border-primary)] h-[54vh] min-h-[380px] bg-[#05060a]">
      <MapContainer
        center={center}
        zoom={2.5}
        zoomControl={false}
        scrollWheelZoom
        worldCopyJump
        maxBoundsViscosity={1.0}
        maxBounds={[[-85, -180], [85, 180]]}
        minZoom={2}
        maxZoom={10}
        zoomSnap={0.5}
        zoomDelta={0.5}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
        className="leaflet-container"
      >
        <TileLayer
          url="https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_4h5g_1_91c0396c4c6fb0ab49683029"
          maxZoom={19}
          noWrap
        />
        <LayerGroup>
          <MapCanvas />
          <LiveFlightsLayer />
          <StaticGeoLayer />
          <SeverityMarkers />
          <MapBinding />
        </LayerGroup>
      </MapContainer>

      {mapMode === '3D' && (
        <div className="absolute inset-0 z-[8]">
          <Map3D />
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-primary)]">Global Situation Map</span>
          <Dot color="#00ff88" pulse />
          <span className="font-mono text-[9px] text-[var(--color-text-muted)]">LIVE</span>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 z-[500] w-52">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 panel-glass border border-[var(--color-border-primary)] rounded-t-md font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)] transition-colors"
        >
          <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" /> LAYERS</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {open && (
          <div className="panel-glass border border-t-0 border-[var(--color-border-primary)] rounded-b-md p-1.5 space-y-0.5 max-h-[30vh] overflow-auto">
            {DASHBOARD_LAYERS.map((l) => {
              const on = isLayerActive(l.id)
              return (
                <button
                  key={l.id}
                  onClick={() => toggleLayer(l.id)}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-sm hover:bg-white/[0.04] transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-sm border flex items-center justify-center shrink-0"
                    style={{ borderColor: on ? 'var(--color-accent-emerald)' : 'var(--color-border-secondary)', background: on ? 'var(--color-accent-emerald)' : 'transparent' }}
                  >
                    {on && <span className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                  </span>
                  <span className={`font-mono text-[10px] ${on ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{l.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-2 z-[500] panel-glass border border-[var(--color-border-primary)] rounded-md px-2.5 py-1.5">
        <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {MAP_LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
              <span className="font-mono text-[9px] text-[var(--color-text-secondary)] whitespace-nowrap">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GlobalMapPanel
