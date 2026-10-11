import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Plane, Radar, Gauge } from 'lucide-react'
import { useFlights } from '../../context/FlightContext.jsx'
import { getFlightRoute } from '../../services/flights.js'
import { Panel, DataTable, StatTile, Dot } from './ui.jsx'

const PLANE_PATH = 'M12 1.6 L13.4 8.6 L21.5 12.4 L21.5 14.2 L13.4 12.6 L13 20 L15.6 21.2 L15.6 22.6 L12 21.7 L8.4 22.6 L8.4 21.2 L11 20 L10.6 12.6 L2.5 14.2 L2.5 12.4 L10.6 8.6 Z'

function planeIcon(f, color) {
  return L.divIcon({
    className: 'radar-plane',
    html: `<div style="transform: rotate(${f.heading || 0}deg)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" style="filter: drop-shadow(0 0 3px ${color})"><path d="${PLANE_PATH}"/></svg>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })
}

const airportIcon = (a, kind) => L.divIcon({
  className: 'radar-airport',
  html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%)">
    <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${kind === 'O' ? '#00ff88' : '#b84dff'};background:rgba(7,9,14,0.85);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:8px;color:${kind === 'O' ? '#00ff88' : '#b84dff'};font-weight:700">${kind}</div>
    <div style="font-family:monospace;font-size:8px;color:${kind === 'O' ? '#00ff88' : '#b84dff'};white-space:nowrap;margin-top:1px">${a.iata || a.icao || ''}</div>
  </div>`,
  iconSize: [36, 28],
  iconAnchor: [18, 14]
})

/** Renders rotated aircraft markers. `center`+`radiusKm` filter for local radar. */
const RadarFlights = ({ center, radiusKm, onCount }) => {
  const map = useMap()
  const { flights, selectFlight } = useFlights()
  const groupRef = useRef(null)

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    return () => { map.removeLayer(group) }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    let n = 0
    for (const f of flights) {
      if (f.onGround || typeof f.lat !== 'number' || typeof f.lng !== 'number') continue
      if (center && radiusKm) {
        const dLat = (f.lat - center[0]) * 111
        const dLng = (f.lng - center[1]) * 111 * Math.cos((center[0] * Math.PI) / 180)
        if (Math.sqrt(dLat * dLat + dLng * dLng) > radiusKm) continue
      }
      const color = f.military ? '#b84dff' : '#00d4ff'
      const m = L.marker([f.lat, f.lng], { icon: planeIcon(f, color) })
      m.bindTooltip(`${(f.callsign || f.icao24 || '').trim()} · ${f.altitude ?? '?'}ft`, { className: 'custom-tooltip', sticky: true })
      m.on('click', () => selectFlight(f))
      m.addTo(group)
      n++
      if (n >= 400) break
    }
    onCount?.(n)
  }, [flights, center, radiusKm, selectFlight, onCount])

  return null
}

const RangeRings = ({ center, rangeVisible = true }) => {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    if (rangeVisible) {
      ;[50, 100, 200].forEach((km) => {
        L.circle(center, { radius: km * 1000, color: '#ffb800', weight: 1, opacity: 0.4, fill: false, dashArray: '4 6' }).addTo(group)
      })
      L.circleMarker(center, { radius: 4, color: '#ff3355', fillColor: '#ff3355', fillOpacity: 1, weight: 2 }).addTo(group)
    }
    return () => { map.removeLayer(group) }
  }, [map, center, rangeVisible])
  return null
}

const RouteVectors = ({ flights }) => {
  const map = useMap()
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    let cancelled = false
    const nearest = flights.filter((f) => !f.onGround && f.callsign).slice(0, 3)
    ;(async () => {
      const out = []
      for (const f of nearest) {
        try {
          const r = await getFlightRoute(f.callsign.trim())
          if (r?.found) out.push({ f, r })
        } catch { /* ignore */ }
      }
      if (!cancelled) setRoutes(out)
    })()
    return () => { cancelled = true }
  }, [flights])

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    routes.forEach(({ f, r }) => {
      const cur = [f.lat, f.lng]
      if (r.origin?.lat != null) {
        L.polyline([[r.origin.lat, r.origin.lng], cur], { color: '#00d4ff', weight: 1.5, opacity: 0.8 }).addTo(group)
        L.marker([r.origin.lat, r.origin.lng], { icon: airportIcon(r.origin, 'O') }).addTo(group)
      }
      if (r.destination?.lat != null) {
        L.polyline([cur, [r.destination.lat, r.destination.lng]], { color: '#b84dff', weight: 1.5, opacity: 0.7, dashArray: '5 6' }).addTo(group)
        L.marker([r.destination.lat, r.destination.lng], { icon: airportIcon(r.destination, 'D') }).addTo(group)
      }
    })
    return () => { map.removeLayer(group) }
  }, [map, routes])

  return null
}

const baseTile = (
  <TileLayer
    url="https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_4h5g_1_91c0396c4c6fb0ab49683029"
    maxZoom={19}
    noWrap
  />
)

const DELHI = [28.6139, 77.209]

export const AircraftMetricsPanel = () => {
  const { flights, source, lastUpdate, loading } = useFlights()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])
  const active = flights.filter((f) => !f.onGround).length
  const military = flights.filter((f) => f.military).length

  return (
    <Panel title="Aircraft Metrics" icon={Gauge} accent="var(--color-accent-violet)"
      right={<Dot color={loading ? '#ffb800' : '#00ff88'} pulse={loading} />}>
      <div className="grid grid-cols-2 gap-1.5">
        <StatTile label="Active Flights" value={active.toLocaleString()} color="var(--color-accent-cyan)" sub={source || 'opensky'} />
        <StatTile label="Military" value={military} color="var(--color-accent-violet)" sub="ADS-B proxy" />
        <StatTile label="On Ground" value={(flights.length - active).toLocaleString()} color="var(--color-text-secondary)" />
        <StatTile label="Coverage" value={`${new Set(flights.map((f) => f.originCountry)).size}`} color="var(--color-accent-emerald)" sub="origin countries" />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[8px] text-[var(--color-text-muted)]">
        <span>GPS INTERFERENCE · <span className="text-[var(--color-accent-amber)]">MONITORING</span></span>
        <span>{lastUpdate ? `${Math.floor((now - lastUpdate) / 1000)}s ago` : '—'}</span>
      </div>
    </Panel>
  )
}

export const FlightDataPanel = () => {
  const { flights } = useFlights()
  const rows = useMemo(() => flights.filter((f) => !f.onGround).slice(0, 60), [flights])
  const columns = [
    { key: 'callsign', label: 'Callsign', render: (f) => <span className="text-[var(--color-text-primary)]">{(f.callsign || f.icao24 || '').trim() || '—'}</span> },
    { key: 'type', label: 'Type', render: (f) => f.aircraftType || '—' },
    { key: 'alt', label: 'Alt', align: 'right', render: (f) => f.altitude != null ? `${Math.round(f.altitude).toLocaleString()}` : '—' },
    { key: 'spd', label: 'Spd', align: 'right', render: (f) => f.velocity != null ? `${Math.round(f.velocity)}` : '—' },
    { key: 'squawk', label: 'Squawk', align: 'right', render: (f) => f.squawk || '—' },
    { key: 'route', label: 'Route', render: (f) => <span className="text-[var(--color-text-muted)]">{f.originCountry || '—'}</span> }
  ]
  return (
    <Panel title="Flight Data" icon={Plane} accent="var(--color-accent-cyan)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{rows.length} TRACKED</span>}>
      <DataTable columns={columns} rows={rows} rowKey={(f) => f.icao24} maxHeight="26vh" compact />
    </Panel>
  )
}

export const GlobalFlightRadarPanel = () => {
  const [count, setCount] = useState(0)
  const center = useMemo(() => [20, 0], [])
  return (
    <Panel title="Global Flight Radar" icon={Radar} accent="var(--color-accent-cyan)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{count} AIRCRAFT</span>}>
      <div className="rounded border border-[var(--color-border-primary)] overflow-hidden h-[26vh]">
        <MapContainer center={center} zoom={2.4} zoomControl={false} attributionControl={false}
          worldCopyJump maxBounds={[[-85, -180], [85, 180]]} minZoom={2} maxZoom={9} style={{ width: '100%', height: '100%' }}>
          {baseTile}
          <RadarFlights onCount={setCount} />
        </MapContainer>
      </div>
    </Panel>
  )
}

export const LocalRadarPanel = () => {
  const { flights } = useFlights()
  const [count, setCount] = useState(0)
  const center = DELHI

  const nearby = useMemo(() => flights.filter((f) => {
    if (f.onGround) return false
    const dLat = (f.lat - center[0]) * 111
    const dLng = (f.lng - center[1]) * 111 * Math.cos((center[0] * Math.PI) / 180)
    return Math.sqrt(dLat * dLat + dLng * dLng) < 250
  }), [flights, center])

  return (
    <Panel title="Local Radar · Delhi Automation" icon={Radar} accent="var(--color-accent-amber)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{count} IN RANGE</span>}>
      <div className="rounded border border-[var(--color-border-primary)] overflow-hidden h-[26vh]">
        <MapContainer center={center} zoom={6} zoomControl={false} attributionControl={false} style={{ width: '100%', height: '100%' }}>
          {baseTile}
          <RangeRings center={center} />
          <RadarFlights center={center} radiusKm={250} onCount={setCount} />
          <RouteVectors flights={nearby} />
        </MapContainer>
      </div>
      <div className="mt-1 font-mono text-[8px] text-[var(--color-text-muted)]">
        ORIGIN ●──▶ DELHI ──▶ DESTINATION · center {center[0].toFixed(3)}, {center[1].toFixed(3)}
      </div>
    </Panel>
  )
}
