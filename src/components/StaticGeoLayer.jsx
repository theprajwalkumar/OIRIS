import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { HEATMAP_ZONES, MILITARY_BASES, NUCLEAR_SITES, INTEL_HOTSPOTS, PIPELINES } from '../utils/constants.js'
import { GAMMA_IRRADIATORS, buildRadiationWatch, SPACEPORTS, SUBMARINE_CABLES } from '../utils/dashboardData.js'

const radiationStations = buildRadiationWatch()

const dotIcon = (color, size = 8) => L.divIcon({
  className: 'geo-static-icon',
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(7,9,14,0.9);box-shadow:0 0 8px ${color}"></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2]
})

const StaticGeoLayer = () => {
  const map = useMap()
  const { activeLayers, getLayerOpacity } = useMapLayers()
  const groupRef = useRef(null)

  useEffect(() => {
    if (!map) return
    const group = L.layerGroup().addTo(map)
    groupRef.current = group
    return () => {
      map.removeLayer(group)
    }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()

    if (activeLayers['tension-heatmap']) {
      HEATMAP_ZONES.forEach(zone => {
        L.polygon(zone.ring, {
          color: zone.color,
          weight: 1,
          opacity: 0.55,
          fillColor: zone.color,
          fillOpacity: 0.12 + zone.intensity * 0.22,
          className: 'tension-zone'
        })
          .bindTooltip(`${zone.label} — ${Math.round(zone.intensity * 100)}% instability`, { className: 'custom-tooltip', sticky: true })
          .addTo(group)
      })
    }

    if (activeLayers['intel-hotspots']) {
      INTEL_HOTSPOTS.forEach(spot => {
        const color = spot.level === 'critical' ? '#ff3355' : spot.level === 'high' ? '#ffb800' : '#00d4ff'
        L.circle([spot.lat, spot.lng], {
          radius: spot.radius,
          color,
          weight: 1,
          opacity: 0.5,
          fillColor: color,
          fillOpacity: 0.06,
          dashArray: '3 5'
        }).bindTooltip(spot.name, { className: 'custom-tooltip', sticky: true }).addTo(group)
        L.circleMarker([spot.lat, spot.lng], {
          radius: 3, color, fillColor: color, fillOpacity: 1, weight: 1
        }).addTo(group)
      })
    }

    if (activeLayers['military-bases']) {
      MILITARY_BASES.forEach(base => {
        L.marker([base.lat, base.lng], { icon: dotIcon('#b84dff', 7) })
          .bindTooltip(`Base · ${base.name} (${base.country})`, { className: 'custom-tooltip', sticky: true })
          .addTo(group)
      })
    }

    if (activeLayers['nuclear-sites']) {
      NUCLEAR_SITES.forEach(site => {
        L.marker([site.lat, site.lng], { icon: dotIcon('#00ff88', 7) })
          .bindTooltip(`Nuclear · ${site.name} (${site.country})`, { className: 'custom-tooltip', sticky: true })
          .addTo(group)
      })
    }

    if (activeLayers['pipelines']) {
      PIPELINES.forEach(pipe => {
        L.polyline(pipe.path, {
          color: pipe.color,
          weight: 2,
          opacity: 0.65,
          dashArray: '2 6'
        }).bindTooltip(`Pipeline · ${pipe.name}`, { className: 'custom-tooltip', sticky: true }).addTo(group)
      })
    }

    if (activeLayers['gamma-irradiators']) {
      GAMMA_IRRADIATORS.forEach(site => {
        L.marker([site.lat, site.lng], { icon: dotIcon('#ffb800', 6) })
          .bindTooltip(`Gamma Irradiator · ${site.name} (${site.country})`, { className: 'custom-tooltip', sticky: true })
          .addTo(group)
      })
    }

    if (activeLayers['radiation-watch']) {
      radiationStations.forEach(st => {
        const color = st.status === 'elevated' ? '#ff3355' : '#00ff88'
        L.circleMarker([st.lat, st.lng], {
          radius: 3, color, fillColor: color, fillOpacity: 0.9, weight: 1
        }).bindTooltip(`${st.name} · ${st.dose} µSv/h`, { className: 'custom-tooltip', sticky: true }).addTo(group)
      })
    }

    if (activeLayers['spaceports']) {
      SPACEPORTS.forEach(sp => {
        L.marker([sp.lat, sp.lng], { icon: dotIcon('#00d4ff', 6) })
          .bindTooltip(`Spaceport · ${sp.name} (${sp.country})`, { className: 'custom-tooltip', sticky: true })
          .addTo(group)
      })
    }

    if (activeLayers['submarine-cables']) {
      SUBMARINE_CABLES.forEach(cable => {
        const color = cable.status === 'degraded' ? '#ffb800' : '#00d4ff'
        L.polyline(cable.path, {
          color, weight: 1.5, opacity: 0.55, dashArray: '1 6'
        }).bindTooltip(`Cable · ${cable.name} (${cable.status})`, { className: 'custom-tooltip', sticky: true }).addTo(group)
      })
    }
  }, [activeLayers, getLayerOpacity])

  return null
}

export default StaticGeoLayer
