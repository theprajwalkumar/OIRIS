import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useFlights } from '../context/FlightContext.jsx'

const PLANE_PATH = 'M12 1.6 L13.4 8.6 L21.5 12.4 L21.5 14.2 L13.4 12.6 L13 20 L15.6 21.2 L15.6 22.6 L12 21.7 L8.4 22.6 L8.4 21.2 L11 20 L10.6 12.6 L2.5 14.2 L2.5 12.4 L10.6 8.6 Z'

function makeIcon(flight, isSelected) {
  const color = isSelected ? '#ffb800' : flight.military ? '#b84dff' : '#00d4ff'
  const glow = isSelected ? '#ffb800' : color
  return L.divIcon({
    className: 'aircraft-icon',
    html: `<div class="aircraft-rot" style="transform: rotate(${flight.heading || 0}deg)">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}" style="filter: drop-shadow(0 0 3px ${glow})">
        <path d="${PLANE_PATH}"/>
      </svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  })
}

function airportIcon(airport, kind) {
  const color = kind === 'O' ? '#00ff88' : '#b84dff'
  return L.divIcon({
    className: 'airport-icon',
    html: `<div style="transform: translate(-50%,-50%)">
      <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${color};background:rgba(7,9,14,0.85);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:9px;color:${color};font-weight:700">${kind}</div>
      <div style="font-family:monospace;font-size:9px;color:${color};text-align:center;margin-top:2px;white-space:nowrap">${airport.iata || airport.icao || ''}</div>
    </div>`,
    iconSize: [40, 30],
    iconAnchor: [20, 15]
  })
}

const LiveFlightsLayer = () => {
  const map = useMap()
  const { flights, selectedFlight, route, radar, rangeVisible, selectFlight } = useFlights()

  const markersRef = useRef(new Map())
  const groupRef = useRef(null)
  const vectorRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    return () => {
      markersRef.current.forEach(({ marker }) => group.removeLayer(marker))
      markersRef.current.clear()
      map.removeLayer(group)
    }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    const activeIds = new Set()
    const list = flights.filter(f => !f.onGround && typeof f.lat === 'number').slice(0, 300)

    list.forEach(f => {
      activeIds.add(f.icao24)
      const isSel = selectedFlight && selectedFlight.icao24 === f.icao24
      const entry = markersRef.current.get(f.icao24)
      if (!entry) {
        const marker = L.marker([f.lat, f.lng], { icon: makeIcon(f, isSel), zIndexOffset: isSel ? 1000 : 0 })
        marker.on('click', () => selectFlight(f))
        marker.addTo(group)
        markersRef.current.set(f.icao24, { marker, data: f })
      } else {
        entry.data = f
        entry.marker.setLatLng([f.lat, f.lng])
        entry.marker.setIcon(makeIcon(f, isSel))
      }
    })

    markersRef.current.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        group.removeLayer(entry.marker)
        markersRef.current.delete(id)
      }
    })
  }, [flights, selectedFlight, selectFlight])

  useEffect(() => {
    const interval = setInterval(() => {
      markersRef.current.forEach(entry => {
        const f = entry.data
        if (!f || !f.velocity || !f.heading || f.onGround) return
        const kmPerSec = f.velocity * 0.000514444
        const rad = f.heading * Math.PI / 180
        const dLat = (kmPerSec / 111.32) * Math.cos(rad)
        const dLng = (kmPerSec / (111.32 * Math.cos(f.lat * Math.PI / 180))) * Math.sin(rad)
        f.lat += dLat
        f.lng += dLng
        entry.marker.setLatLng([f.lat, f.lng])
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (vectorRef.current) {
      map.removeLayer(vectorRef.current)
      vectorRef.current = null
    }
    if (!selectedFlight || !route || !route.found) return

    const group = L.layerGroup().addTo(map)
    const cur = [selectedFlight.lat, selectedFlight.lng]

    if (route.origin?.lat != null && route.origin?.lng != null) {
      const o = [route.origin.lat, route.origin.lng]
      L.polyline([o, cur], { color: '#00d4ff', weight: 2, opacity: 0.9 }).addTo(group)
      L.marker(o, { icon: airportIcon(route.origin, 'O') }).addTo(group)
    }
    if (route.destination?.lat != null && route.destination?.lng != null) {
      const d = [route.destination.lat, route.destination.lng]
      L.polyline([cur, d], { color: '#b84dff', weight: 2, opacity: 0.85, dashArray: '6 8' }).addTo(group)
      L.marker(d, { icon: airportIcon(route.destination, 'D') }).addTo(group)
    }

    vectorRef.current = group
    return () => {
      map.removeLayer(group)
    }
  }, [selectedFlight, route, map])

  useEffect(() => {
    if (ringRef.current) {
      map.removeLayer(ringRef.current)
      ringRef.current = null
    }
    if (!radar || !rangeVisible) return

    const group = L.layerGroup().addTo(map)
    ;[50, 100, 200].forEach(km => {
      L.circle([radar.lat, radar.lng], {
        radius: km * 1000,
        color: '#ffb800',
        weight: 1,
        opacity: 0.45,
        fill: false,
        dashArray: '4 6'
      }).addTo(group)
    })
    L.circleMarker([radar.lat, radar.lng], {
      radius: 4,
      color: '#ff3355',
      fillColor: '#ff3355',
      fillOpacity: 1,
      weight: 2
    }).addTo(group)

    ringRef.current = group
    return () => {
      map.removeLayer(group)
    }
  }, [radar, rangeVisible, map])

  return null
}

export default LiveFlightsLayer
