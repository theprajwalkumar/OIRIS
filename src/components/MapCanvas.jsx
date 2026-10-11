import React, { useMemo, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useEvents } from '../context/EventContext.jsx'
import { useWS } from '../context/WSContext.jsx'
import { getSeverityColor } from '../utils/helpers.js'
import { EVENT_CATEGORIES, MARITIME_CHOKEPOINTS } from '../utils/constants.js'

const NATURAL_EVENT_COLORS = {
  wildfire: '#ff3355',
  flood: '#00d4ff',
  drought: '#ffb800',
  dust: '#c9a227',
  ice: '#7fd8ff',
  landslide: '#ff8a3a'
}

const ConflictLayer = ({ events, map }) => {
  const layerRef = useRef(null)
  
  useEffect(() => {
    if (!map || !events.size) return
    
    const conflictEvents = Array.from(events.values()).filter(e => 
      e.category === 'conflict' || e.type === 'conflict'
    )
    
    if (conflictEvents.length === 0) return
    
    const group = L.layerGroup()
    
    conflictEvents.forEach(event => {
      const color = getSeverityColor(event.severity)
      const marker = L.circleMarker([event.lat, event.lng], {
        radius: 8 + (event.severity === 'critical' ? 4 : 0),
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
        className: 'custom-marker conflict-marker'
      })
      
      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
          <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${event.title}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${event.category.toUpperCase()} · ${event.severity.toUpperCase()}</div>
          <div style="color: #e8f0f8; font-size: 11px;">${event.details?.description || 'Active conflict zone'}</div>
          <div style="color: #64748b; font-size: 10px; margin-top: 8px;">Source: ${event.source} · ${new Date(event.timestamp).toLocaleString()}</div>
        </div>
      `, { className: 'custom-popup' })
      
      group.addLayer(marker)
    })
    
    group.addTo(map)
    layerRef.current = group
    
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map, events])
  
  return null
}

const MaritimeLayer = ({ events, map, activeLayers }) => {
  const chokepointRef = useRef(null)
  
  useEffect(() => {
    if (!map) return
    
    if (activeLayers['chokepoints'] && !chokepointRef.current) {
      const group = L.layerGroup()
      MARITIME_CHOKEPOINTS.forEach(cp => {
        const circle = L.circle([cp.lat, cp.lng], {
          radius: cp.width * 1852,
          color: cp.critical ? '#ff3355' : '#00d4ff',
          weight: 1.5,
          opacity: 0.6,
          fillColor: cp.critical ? '#ff3355' : '#00d4ff',
          fillOpacity: 0.08,
          dashArray: '8, 8',
          className: 'chokepoint-circle'
        })
        
        const label = L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
            className: 'chokepoint-label',
            html: `<div style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: ${cp.critical ? '#ff3355' : '#00d4ff'}; text-shadow: 0 0 4px rgba(0,0,0,0.8); white-space: nowrap;">${cp.name}</div>`,
            iconSize: [120, 20],
            iconAnchor: [60, 10]
          })
        })
        
        group.addLayer(circle)
        group.addLayer(label)
      })
      group.addTo(map)
      chokepointRef.current = group
    } else if (!activeLayers['chokepoints'] && chokepointRef.current) {
      map.removeLayer(chokepointRef.current)
      chokepointRef.current = null
    }
    
    return () => {
      if (chokepointRef.current) map.removeLayer(chokepointRef.current)
    }
  }, [map, events, activeLayers])
  
  return null
}

const AviationLayer = ({ events, map, activeLayers }) => {
  const layerRef = useRef(null)
  const weatherRef = useRef(null)
  
  useEffect(() => {
    if (!map) return
    
    if (activeLayers['adsb-flights'] || activeLayers['military-flights']) {
      const flightEvents = Array.from(events.values()).filter(e => 
        e.category === 'flight' || e.type === 'flight' || e.category === 'military-flight'
      )
      
      if (flightEvents.length > 0) {
        const group = L.layerGroup()
        flightEvents.slice(0, 200).forEach(event => {
          const isMilitary = event.category === 'military-flight' || event.details?.military
          const color = isMilitary ? '#b84dff' : '#00d4ff'
          
          const marker = L.marker([event.lat, event.lng], {
            icon: L.divIcon({
              className: 'flight-marker',
              html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            }),
            rotationAngle: event.details?.heading || 0,
            rotationOrigin: 'center'
          })
          
          marker.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
              <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${event.details?.callsign || 'UNKNOWN'} ${isMilitary ? '● MIL' : ''}</div>
              <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">ICAO: ${event.details?.icao24 || 'N/A'} · ${event.severity.toUpperCase()}</div>
              <div style="color: #e8f0f8; font-size: 11px;">Type: ${event.details?.aircraftType || 'Unknown'}</div>
              <div style="color: #e8f0f8; font-size: 11px;">Alt: ${event.details?.altitude || 0} ft · Spd: ${event.details?.velocity || 0} kt</div>
              <div style="color: #e8f0f8; font-size: 11px;">From: ${event.details?.origin || '???'} → To: ${event.details?.destination || '???'}</div>
              <div style="color: #64748b; font-size: 10px; margin-top: 8px;">${new Date(event.timestamp).toLocaleString()}</div>
            </div>
          `, { className: 'custom-popup' })
          
          group.addLayer(marker)
        })
        group.addTo(map)
        layerRef.current = group
      }
    } else if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    
    if (activeLayers['aviation-weather']) {
      const wxEvents = Array.from(events.values()).filter(e => 
        e.category === 'aviation-weather' || e.type === 'metar'
      )
      
      if (wxEvents.length > 0) {
        const group = L.layerGroup()
        wxEvents.forEach(event => {
          const color = getSeverityColor(event.severity)
          const cat = event.details?.flightCategory || 'IFR'
          const marker = L.marker([event.lat, event.lng], {
            icon: L.divIcon({
              className: 'metar-marker',
              html: `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:${color};border:1px solid ${color};background:rgba(7,9,14,0.75);border-radius:3px;padding:1px 3px;white-space:nowrap;box-shadow:0 0 8px ${color}66">${cat}</div>`,
              iconSize: [40, 16],
              iconAnchor: [20, 8]
            })
          })
          
          marker.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
              <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${cat} · ${event.details?.icao || ''}</div>
              <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${event.details?.conditions || 'Adverse conditions'}</div>
              <div style="color: #e8f0f8; font-size: 11px;">Wind: ${event.details?.wind || 'N/A'}</div>
              <div style="color: #e8f0f8; font-size: 11px;">Vis: ${event.details?.visibility ?? 'N/A'} · Ceiling: ${event.details?.ceilingFt ?? 'N/A'} ft</div>
              <div style="color: #e8f0f8; font-size: 11px;">Temp ${event.details?.temperatureC ?? '?'}°C / Dew ${event.details?.dewpointC ?? '?'}°C</div>
              <div style="color: #64748b; font-size: 10px; margin-top: 8px;">NOAA METAR · ${new Date(event.timestamp).toLocaleString()}</div>
            </div>
          `, { className: 'custom-popup' })
          
          group.addLayer(marker)
        })
        if (weatherRef.current) map.removeLayer(weatherRef.current)
        group.addTo(map)
        weatherRef.current = group
      }
    } else if (weatherRef.current) {
      map.removeLayer(weatherRef.current)
      weatherRef.current = null
    }
    
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
      if (weatherRef.current) map.removeLayer(weatherRef.current)
    }
  }, [map, events, activeLayers])
  
  return null
}

const InfrastructureLayer = ({ events, map, activeLayers }) => {
  const layerRef = useRef(null)
  const cableRef = useRef(null)
  
  useEffect(() => {
    if (!map) return
    
    if (activeLayers['submarine-cables'] && !cableRef.current) {
      const group = L.layerGroup()
      
      const cables = [
        { name: 'MAREA', coords: [[37.1, -6.8], [39.4, -74.3]], capacity: '200 Tbps', status: 'operational' },
        { name: 'AEC-1', coords: [[1.3, 103.8], [-33.9, 151.2]], capacity: '40 Tbps', status: 'operational' },
        { name: 'SEA-ME-WE 5', coords: [[1.3, 103.8], [31.2, 29.9]], capacity: '24 Tbps', status: 'operational' },
        { name: 'TAT-14', coords: [[40.7, -74.0], [51.5, -0.1]], capacity: '18 Tbps', status: 'operational' },
        { name: 'PACIFIC LIGHT', coords: [[1.3, 103.8], [37.7, -122.4]], capacity: '80 Tbps', status: 'operational' },
        { name: 'EIG', coords: [[1.3, 103.8], [31.2, 29.9]], capacity: '3.8 Tbps', status: 'degraded' },
        { name: 'FLAG', coords: [[25.2, 55.3], [51.5, -0.1]], capacity: '10 Tbps', status: 'operational' },
        { name: 'SEACOM', coords: [[-33.9, 18.4], [1.3, 103.8]], capacity: '12 Tbps', status: 'operational' }
      ]
      
      cables.forEach(cable => {
        const color = cable.status === 'operational' ? '#00ff88' : '#ffb800'
        const line = L.polyline(cable.coords, {
          color: color,
          weight: 2,
          opacity: 0.7,
          dashArray: '10, 5',
          className: 'cable-line'
        })
        
        line.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
            <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${cable.name}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">Submarine Cable · ${cable.status.toUpperCase()}</div>
            <div style="color: #e8f0f8; font-size: 11px;">Capacity: ${cable.capacity}</div>
            <div style="color: #e8f0f8; font-size: 11px;">Status: ${cable.status}</div>
          </div>
        `, { className: 'custom-popup' })
        
        group.addLayer(line)
      })
      
      group.addTo(map)
      cableRef.current = group
    } else if (!activeLayers['submarine-cables'] && cableRef.current) {
      map.removeLayer(cableRef.current)
      cableRef.current = null
    }
    
    if (activeLayers['internet-outages']) {
      const outageEvents = Array.from(events.values()).filter(e => 
        e.category === 'internet-outage' || e.type === 'internet-outage'
      )
      
      if (outageEvents.length > 0) {
        const group = L.layerGroup()
        outageEvents.forEach(event => {
          const color = getSeverityColor(event.severity)
          const marker = L.circleMarker([event.lat, event.lng], {
            radius: 10,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 1,
            fillOpacity: 0.4,
            className: 'custom-marker outage-marker'
          })
          
          marker.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
              <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">INTERNET OUTAGE</div>
              <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${event.countryCode || 'UNKNOWN'} · ${event.severity.toUpperCase()}</div>
              <div style="color: #e8f0f8; font-size: 11px;">ASN: ${event.details?.asn || 'N/A'}</div>
              <div style="color: #e8f0f8; font-size: 11px;">Impact: ${event.details?.impact || 'Unknown'}</div>
              <div style="color: #64748b; font-size: 10px; margin-top: 8px;">IODA · ${new Date(event.timestamp).toLocaleString()}</div>
            </div>
          `, { className: 'custom-popup' })
          
          group.addLayer(marker)
        })
        
        if (layerRef.current) map.removeLayer(layerRef.current)
        group.addTo(map)
        layerRef.current = group
      }
    } else if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
      if (cableRef.current) map.removeLayer(cableRef.current)
    }
  }, [map, events, activeLayers])
  
  return null
}

const PhysicalLayer = ({ events, map, activeLayers }) => {
  const layerRef = useRef(null)
  
  useEffect(() => {
    if (!map) return
    
    const group = L.layerGroup()
    let hasEvents = false
    
    if (activeLayers['earthquakes']) {
      const eqEvents = Array.from(events.values()).filter(e => 
        e.category === 'earthquake' || e.type === 'earthquake'
      )
      
      eqEvents.forEach(event => {
        hasEvents = true
        const mag = event.details?.magnitude || 0
        const radius = Math.max(5, Math.min(30, mag * 3))
        const color = mag >= 7 ? '#ff3355' : mag >= 5 ? '#ffb800' : '#00d4ff'
        
        const circle = L.circleMarker([event.lat, event.lng], {
          radius,
          fillColor: color,
          color: color,
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.5,
          className: 'custom-marker earthquake-marker'
        })
        
        circle.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
            <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">M${mag.toFixed(1)} EARTHQUAKE</div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${event.details?.location || 'Unknown location'}</div>
            <div style="color: #e8f0f8; font-size: 11px;">Depth: ${event.details?.depth || 0} km</div>
            <div style="color: #e8f0f8; font-size: 11px;">Time: ${new Date(event.timestamp).toLocaleString()}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 8px;">Source: ${event.source}</div>
          </div>
        `, { className: 'custom-popup' })
        
        group.addLayer(circle)
      })
    }
    
    if (activeLayers['wildfires']) {
      const naturalCats = ['wildfire', 'flood', 'drought', 'dust', 'ice', 'landslide']
      const naturalEvents = Array.from(events.values()).filter(e => naturalCats.includes(e.category))
      
      naturalEvents.forEach(event => {
        hasEvents = true
        const color = NATURAL_EVENT_COLORS[event.category] || '#ff3355'
        const marker = L.circleMarker([event.lat, event.lng], {
          radius: event.category === 'wildfire' ? 5 : 6,
          fillColor: color,
          color: color,
          weight: 1.5,
          opacity: 0.85,
          fillOpacity: 0.45,
          className: 'custom-marker natural-marker'
        })
        
        marker.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
            <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${event.title}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${(event.category || '').toUpperCase()} · ${event.severity.toUpperCase()}</div>
            <div style="color: #e8f0f8; font-size: 11px;">${event.details?.provider ? 'Provider: ' + event.details.provider : ''}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 8px;">NASA EONET · ${new Date(event.timestamp).toLocaleString()}</div>
          </div>
        `, { className: 'custom-popup' })
        
        group.addLayer(marker)
      })
    }
    
    if (activeLayers['disasters']) {
      const disasterEvents = Array.from(events.values()).filter(e => e.category === 'disaster')
      
      disasterEvents.forEach(event => {
        hasEvents = true
        const color = getSeverityColor(event.severity)
        const marker = L.circleMarker([event.lat, event.lng], {
          radius: 9,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.35,
          className: 'custom-marker disaster-marker'
        })
        
        marker.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; min-width: 240px;">
            <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${event.title}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${(event.details?.eventType || '')} · ${(event.details?.alertLevel || '').toUpperCase()} · ${event.countryCode || ''}</div>
            <div style="color: #e8f0f8; font-size: 11px;">Alert score: ${event.details?.alertScore ?? 'N/A'}</div>
            <div style="color: #e8f0f8; font-size: 11px;">From: ${event.details?.fromDate || 'N/A'}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 8px;">GDACS · ${new Date(event.timestamp).toLocaleString()}</div>
          </div>
        `, { className: 'custom-popup' })
        
        group.addLayer(marker)
      })
    }
    
    if (activeLayers['volcanoes']) {
      const volcanoEvents = Array.from(events.values()).filter(e => e.category === 'volcano')
      
      volcanoEvents.forEach(event => {
        hasEvents = true
        const color = '#ff8a3a'
        const marker = L.circleMarker([event.lat, event.lng], {
          radius: 7,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.4,
          className: 'custom-marker volcano-marker'
        })
        
        marker.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
            <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${event.title}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">VOLCANIC ACTIVITY · ${event.severity.toUpperCase()}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 8px;">NASA EONET · ${new Date(event.timestamp).toLocaleString()}</div>
          </div>
        `, { className: 'custom-popup' })
        
        group.addLayer(marker)
      })
    }
    
    if (activeLayers['weather-alerts']) {
      const weatherEvents = Array.from(events.values()).filter(e => 
        e.category === 'weather' || e.type === 'weather'
      )
      
      weatherEvents.forEach(event => {
        hasEvents = true
        const color = getSeverityColor(event.severity)
        const marker = L.marker([event.lat, event.lng], {
          icon: L.divIcon({
            className: 'weather-marker',
            html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        })
        
        marker.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
            <div style="color: ${color}; font-weight: 700; margin-bottom: 4px;">${event.details?.event || 'WEATHER ALERT'}</div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">${event.severity.toUpperCase()}</div>
            <div style="color: #e8f0f8; font-size: 11px;">${event.details?.description || ''}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 8px;">${new Date(event.timestamp).toLocaleString()}</div>
          </div>
        `, { className: 'custom-popup' })
        
        group.addLayer(marker)
      })
    }
    
    if (hasEvents) {
      group.addTo(map)
      layerRef.current = group
    }
    
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, events, activeLayers])
  
  return null
}

const SatelliteLayer = ({ events, map, activeLayers }) => {
  const layerRef = useRef(null)
  
  useEffect(() => {
    if (!map) return
    
    if (activeLayers['satellite-orbits']) {
      const sats = Array.from(events.values()).filter(e => e.category === 'satellite')
      
      if (sats.length > 0) {
        const group = L.layerGroup()
        sats.forEach(event => {
          const track = event.details?.track
          if (Array.isArray(track) && track.length > 1) {
            const line = L.polyline(track, {
              color: '#00ff88',
              weight: 1.5,
              opacity: 0.45,
              dashArray: '6, 6',
              className: 'sat-track'
            })
            group.addLayer(line)
          }
          
          const marker = L.marker([event.lat, event.lng], {
            icon: L.divIcon({
              className: 'sat-marker',
              html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2" style="filter:drop-shadow(0 0 5px rgba(0,255,136,0.7))"><path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/></svg>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            })
          })
          
          marker.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; min-width: 240px;">
              <div style="color: #00ff88; font-weight: 700; margin-bottom: 4px;">${event.title}</div>
              <div style="color: #94a3b8; font-size: 10px; margin-bottom: 8px;">NORAD ${event.details?.noradId || 'N/A'} · ${event.details?.visibility || 'unknown'}</div>
              <div style="color: #e8f0f8; font-size: 11px;">Altitude: ${event.details?.altitudeKm ?? 'N/A'} km · Velocity: ${event.details?.velocityKmh ?? 'N/A'} km/h</div>
              <div style="color: #e8f0f8; font-size: 11px;">Footprint: ${event.details?.footprintKm ?? 'N/A'} km</div>
              <div style="color: #64748b; font-size: 9px; margin-top: 8px; word-break: break-all;">${event.details?.tleLine1 || ''}<br/>${event.details?.tleLine2 || ''}</div>
              <div style="color: #64748b; font-size: 10px; margin-top: 6px;">Source: ${event.source}</div>
            </div>
          `, { className: 'custom-popup' })
          
          group.addLayer(marker)
        })
        group.addTo(map)
        layerRef.current = group
      }
    } else if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, events, activeLayers])
  
  return null
}

const MapCanvas = () => {
  const map = useMap()
  const { activeLayers } = useMapLayers()
  const { events } = useEvents()
  const { status } = useWS()
  
  return (
    <>
      <ConflictLayer events={events} map={map} />
      <SatelliteLayer events={events} map={map} activeLayers={activeLayers} />
      <MaritimeLayer events={events} map={map} activeLayers={activeLayers} />
      <AviationLayer events={events} map={map} activeLayers={activeLayers} />
      <InfrastructureLayer events={events} map={map} activeLayers={activeLayers} />
      <PhysicalLayer events={events} map={map} activeLayers={activeLayers} />
    </>
  )
}

export default MapCanvas