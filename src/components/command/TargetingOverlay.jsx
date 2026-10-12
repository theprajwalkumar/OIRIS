import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useOntology } from '../../context/OntologyContext.jsx'
import { classificationColor } from '../../utils/constants.js'

/**
 * Maven Smart System-style targeting HUD overlay.
 *
 * Renders classification-aware bounding boxes + radar pings for every tracked
 * object with a geocode, and expanding collection footprints for tasked
 * (simulated) sensors. Red/amber = threat/anomaly, cyan/emerald = friendly/neutral.
 */
function trackIcon(entity, selected) {
  const color = classificationColor(entity.classification)
  const hostile = entity.classification === 'hostile'
  const unknown = entity.classification === 'unknown'
  const pulse = hostile || unknown
  return L.divIcon({
    className: 'target-box',
    html: `
      <div class="target-wrap">
        ${pulse ? `<div class="target-ring" style="border-color:${color}"></div>` : ''}
        <div class="target-core" style="border-color:${color};${selected ? `box-shadow:0 0 14px ${color};` : ''}">
          <span class="tc-dot" style="background:${color}"></span>
          <span class="tc-c tl" style="border-color:${color}"></span>
          <span class="tc-c tr" style="border-color:${color}"></span>
          <span class="tc-c bl" style="border-color:${color}"></span>
          <span class="tc-c br" style="border-color:${color}"></span>
        </div>
        <div class="target-label" style="color:${color}">${(entity.label || '').slice(0, 14)}</div>
      </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  })
}

function sensorIcon(entity) {
  const color = classificationColor(entity.classification)
  return L.divIcon({
    className: 'sensor-box',
    html: `
      <div class="sensor-wrap">
        <div class="sensor-sweep" style="border-color:${color}"></div>
        <div class="sensor-core" style="border-color:${color}">◎</div>
        <div class="target-label" style="color:${color}">${(entity.label || 'SENSOR').slice(0, 14)}</div>
      </div>`,
    iconSize: [72, 72],
    iconAnchor: [36, 36]
  })
}

const TargetingOverlay = () => {
  const map = useMap()
  const { entities, selectedEntityId, setSelectedEntity, EntityType } = useOntology()
  const groupRef = useRef(null)

  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    return () => map.removeLayer(group)
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()

    const tracks = entities
      .filter((e) => e.geocode && (e.type === EntityType.MAJOR_END_ITEM || e.type === EntityType.THREAT_ENTITY))
      .slice(0, 120)
    for (const e of tracks) {
      const marker = L.marker([e.lat, e.lng], {
        icon: trackIcon(e, e.id === selectedEntityId),
        interactive: true,
        zIndexOffset: e.classification === 'hostile' ? 900 : 400
      })
      marker.on('click', () => setSelectedEntity(e.id))
      marker.bindTooltip(`${e.label} · ${(e.classification || '').toUpperCase()}`, { className: 'custom-tooltip', direction: 'top', offset: [0, -18] })
      marker.addTo(group)
    }

    // Simulated collection footprints.
    const sensors = entities.filter((e) => e.type === EntityType.INTEL_ASSET && e.geocode).slice(0, 30)
    for (const e of sensors) {
      const marker = L.marker([e.lat, e.lng], { icon: sensorIcon(e), interactive: true, zIndexOffset: 1000 })
      marker.on('click', () => setSelectedEntity(e.id))
      marker.bindTooltip(`${e.label} · ${e.props?.sensorClass || 'EO/IR'} (simulated)`, { className: 'custom-tooltip', direction: 'top', offset: [0, -30] })
      marker.addTo(group)
    }
  }, [entities, selectedEntityId, setSelectedEntity, EntityType, map])

  return null
}

export default TargetingOverlay
