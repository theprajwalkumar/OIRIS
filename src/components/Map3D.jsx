import { useEffect, useRef, useState } from 'react'
import { Map as MaplibreMap, NavigationControl, AttributionControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useUI } from '../context/UIContext.jsx'
import { useEvents } from '../context/EventContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useFlights } from '../context/FlightContext.jsx'
import {
  SEVERITY_LEVELS,
  HEATMAP_ZONES,
  INTEL_HOTSPOTS,
  MILITARY_BASES,
  NUCLEAR_SITES,
  PIPELINES
} from '../utils/constants.js'

const CARTO_DARK = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_4h5g_1_91c0396c4c6fb0ab49683029'
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const EMPTY = { type: 'FeatureCollection', features: [] }

const SEVERITY_COLOR = Object.fromEntries(SEVERITY_LEVELS.map(s => [s.id, s.color]))
const HOTSPOT_COLOR = { critical: '#ff3355', high: '#ffb800', medium: '#00d4ff' }
const PLANE_PATH = 'M12 1.6 L13.4 8.6 L21.5 12.4 L21.5 14.2 L13.4 12.6 L13 20 L15.6 21.2 L15.6 22.6 L12 21.7 L8.4 22.6 L8.4 21.2 L11 20 L10.6 12.6 L2.5 14.2 L2.5 12.4 L10.6 8.6 Z'

const makePlaneImage = () => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const scale = 2.6
  ctx.fillStyle = '#ffffff'
  ctx.translate((size - 24 * scale) / 2, (size - 24 * scale) / 2)
  ctx.scale(scale, scale)
  ctx.fill(new Path2D(PLANE_PATH))
  return ctx.getImageData(0, 0, size, size)
}

const baseStyle = () => ({
  version: 8,
  sources: {
    base: { type: 'raster', tiles: [CARTO_DARK], tileSize: 256, attribution: 'CARTO · © OpenStreetMap' },
    terrain: { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', maxzoom: 15 },
    events: { type: 'geojson', data: EMPTY },
    flights: { type: 'geojson', data: EMPTY },
    zones: { type: 'geojson', data: EMPTY },
    hotspots: { type: 'geojson', data: EMPTY },
    bases: { type: 'geojson', data: EMPTY },
    nuclear: { type: 'geojson', data: EMPTY },
    pipelines: { type: 'geojson', data: EMPTY }
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#04060b' } },
    { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.94 } },
    {
      id: 'zones-fill', type: 'fill', source: 'zones',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['get', 'opacity'],
        'fill-outline-color': 'rgba(255,255,255,0.14)'
      }
    },
    {
      id: 'hotspots-halo', type: 'circle', source: 'hotspots',
      paint: {
        'circle-radius': 20,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.1,
        'circle-stroke-width': 1,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.6
      }
    },
    {
      id: 'hotspots-dot', type: 'circle', source: 'hotspots',
      paint: { 'circle-radius': 2.5, 'circle-color': ['get', 'color'], 'circle-stroke-width': 1, 'circle-stroke-color': '#07090e' }
    },
    {
      id: 'bases', type: 'circle', source: 'bases',
      paint: { 'circle-radius': 4, 'circle-color': '#b84dff', 'circle-stroke-width': 1, 'circle-stroke-color': '#07090e' }
    },
    {
      id: 'nuclear', type: 'circle', source: 'nuclear',
      paint: { 'circle-radius': 4, 'circle-color': '#00ff88', 'circle-stroke-width': 1, 'circle-stroke-color': '#07090e' }
    },
    {
      id: 'pipelines', type: 'line', source: 'pipelines',
      paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.75, 'line-dasharray': [2, 4] }
    },
    {
      id: 'events', type: 'circle', source: 'events',
      paint: {
        'circle-radius': ['interpolate', ['exponential', 0.9], ['zoom'], 2, 3, 8, 8, 12, 12],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#07090e'
      }
    },
    {
      id: 'flights', type: 'symbol', source: 'flights',
      layout: {
        'icon-image': 'plane',
        'icon-size': ['interpolate', ['exponential', 1.2], ['zoom'], 2, 0.55, 6, 1, 10, 1.6],
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      },
      paint: { 'icon-color': ['get', 'color'] }
    }
  ],
  terrain: { source: 'terrain', exaggeration: 0.7 }
})

const toRing = (latlngs) => {
  const ring = latlngs.map(([lat, lng]) => [lng, lat])
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([...ring[0]])
  }
  return ring
}

const Map3D = () => {
  const containerRef = useRef(null)
  const { mapRef, globeRef, setCenter, setZoom, center, zoom } = useUI()
  const { events, getFilteredEvents } = useEvents()
  const { activeLayers } = useMapLayers()
  const { flights, selectedId, selectFlight } = useFlights()
  const syncedView = useRef({ center, zoom })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new MaplibreMap({
      container,
      style: baseStyle(),
      center: [center[1], center[0]],
      zoom,
      minZoom: 2,
      maxZoom: 19,
      maxPitch: 70,
      pitch: 62,
      bearing: 0,
      attributionControl: false
    })

    globeRef.current = map

    const nav = new NavigationControl({ visualizePitch: true })
    map.addControl(nav, 'bottom-right')
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      try {
        map.addImage('plane', makePlaneImage())
      } catch { /* already added */ }
      setReady(true)

      map.on('moveend', () => {
        const c = map.getCenter()
        syncedView.current = { center: [c.lat, c.lng], zoom: map.getZoom() }
        setCenter(c.lat, c.lng)
        setZoom(map.getZoom())
      })

      map.on('click', 'flights', (e) => {
        const feature = e.features && e.features[0]
        if (!feature) return
        const p = feature.properties
        selectFlight({
          icao24: p.icao24,
          callsign: p.callsign,
          military: p.military,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
          altitude: p.altitude,
          velocity: p.velocity,
          heading: p.heading,
          squawk: p.squawk
        })
      })
      map.on('mouseenter', 'flights', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'flights', () => { map.getCanvas().style.cursor = '' })
    })

    return () => {
      setReady(false)
      if (syncedView.current && globeRef.current === map) {
        const leaflet = mapRef.current
        if (leaflet) {
          leaflet.setView(syncedView.current.center, syncedView.current.zoom, { animate: false })
        }
      }
      if (globeRef.current === map) globeRef.current = null
      map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const map = globeRef.current
    if (!map || !ready) return

    const update = () => {
      const gated = activeLayers || {}

      if (gated['tension-heatmap']) {
        map.getSource('zones').setData({
          type: 'FeatureCollection',
          features: HEATMAP_ZONES.map(zone => ({
            type: 'Feature',
            properties: { color: zone.color, opacity: 0.1 + zone.intensity * 0.22 },
            geometry: { type: 'Polygon', coordinates: [toRing(zone.ring)] }
          }))
        })
      } else {
        map.getSource('zones').setData(EMPTY)
      }

      if (gated['intel-hotspots']) {
        map.getSource('hotspots').setData({
          type: 'FeatureCollection',
          features: INTEL_HOTSPOTS.map(h => ({
            type: 'Feature',
            properties: { color: HOTSPOT_COLOR[h.level] || '#00d4ff' },
            geometry: { type: 'Point', coordinates: [h.lng, h.lat] }
          }))
        })
      } else {
        map.getSource('hotspots').setData(EMPTY)
      }

      if (gated['military-bases']) {
        map.getSource('bases').setData({
          type: 'FeatureCollection',
          features: MILITARY_BASES.map(b => ({
            type: 'Feature',
            properties: { name: b.name },
            geometry: { type: 'Point', coordinates: [b.lng, b.lat] }
          }))
        })
      } else {
        map.getSource('bases').setData(EMPTY)
      }

      if (gated['nuclear-sites']) {
        map.getSource('nuclear').setData({
          type: 'FeatureCollection',
          features: NUCLEAR_SITES.map(n => ({
            type: 'Feature',
            properties: { name: n.name },
            geometry: { type: 'Point', coordinates: [n.lng, n.lat] }
          }))
        })
      } else {
        map.getSource('nuclear').setData(EMPTY)
      }

      if (gated['pipelines']) {
        map.getSource('pipelines').setData({
          type: 'FeatureCollection',
          features: PIPELINES.map(p => ({
            type: 'Feature',
            properties: { color: p.color },
            geometry: { type: 'LineString', coordinates: p.path.map(([lat, lng]) => [lng, lat]) }
          }))
        })
      } else {
        map.getSource('pipelines').setData(EMPTY)
      }

      if (gated['conflicts']) {
        const evts = getFilteredEvents().filter(e => e.lat != null && e.lng != null)
        map.getSource('events').setData({
          type: 'FeatureCollection',
          features: evts.map(e => ({
            type: 'Feature',
            properties: { color: SEVERITY_COLOR[e.severity] || '#64748b' },
            geometry: { type: 'Point', coordinates: [e.lng, e.lat] }
          }))
        })
      } else {
        map.getSource('events').setData(EMPTY)
      }

      const list = flights.filter(f => !f.onGround && f.lat != null).slice(0, 300)
      map.getSource('flights').setData({
        type: 'FeatureCollection',
        features: list.map(f => ({
          type: 'Feature',
          properties: {
            icao24: f.icao24,
            callsign: f.callsign,
            military: f.military,
            heading: f.heading || 0,
            altitude: f.altitude,
            velocity: f.velocity,
            squawk: f.squawk,
            color: f.military ? '#b84dff' : '#00d4ff'
          },
          geometry: { type: 'Point', coordinates: [f.lng, f.lat] }
        }))
      })

      map.setPaintProperty('flights', 'icon-color', [
        'case',
        ['==', ['get', 'icao24'], selectedId || ''],
        '#ffb800',
        ['get', 'color']
      ])
    }

    update()
  }, [events, getFilteredEvents, activeLayers, flights, selectedId, globeRef, ready])

  return (
    <div className="absolute inset-0 z-[8]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

export default Map3D