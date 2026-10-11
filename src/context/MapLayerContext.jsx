import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

const MapLayerContext = createContext(null)

const LAYER_GROUPS = {
  geopolitics: {
    id: 'geopolitics',
    label: 'GEOPOLITICS',
    icon: 'Globe',
    color: '#ff3355',
    description: 'Conflicts, civil unrest, satellite orbits',
    layers: [
      { id: 'conflicts', label: 'Active Conflicts', default: true },
      { id: 'civil-unrest', label: 'Civil Unrest', default: false },
      { id: 'satellite-orbits', label: 'Satellite Orbits (ISS)', default: true },
      { id: 'tension-heatmap', label: 'Tension Heatmap', default: true },
      { id: 'intel-hotspots', label: 'Intel Hotspots', default: true },
      { id: 'military-bases', label: 'Military Bases', default: true },
      { id: 'nuclear-sites', label: 'Nuclear Sites', default: false },
      { id: 'gamma-irradiators', label: 'Gamma Irradiators', default: false },
      { id: 'radiation-watch', label: 'Radiation Watch', default: false },
      { id: 'spaceports', label: 'Spaceports', default: true }
    ]
  },
  maritime: {
    id: 'maritime',
    label: 'MARITIME',
    icon: 'Ship',
    color: '#00d4ff',
    description: 'Chokepoints and maritime infrastructure',
    layers: [
      { id: 'chokepoints', label: 'Maritime Chokepoints', default: true },
      { id: 'pipelines', label: 'Pipelines', default: false }
    ]
  },
  aviation: {
    id: 'aviation',
    label: 'AVIATION',
    icon: 'Plane',
    color: '#b84dff',
    description: 'ADS-B tracking, military flights, adverse weather',
    layers: [
      { id: 'adsb-flights', label: 'ADS-B Flight Paths', default: true },
      { id: 'military-flights', label: 'Military Aircraft', default: true },
      { id: 'aviation-weather', label: 'Adverse Aviation Weather (METAR)', default: true }
    ]
  },
  infrastructure: {
    id: 'infrastructure',
    label: 'INFRASTRUCTURE',
    icon: 'Anchor',
    color: '#ffb800',
    description: 'Submarine cables, internet outages, pipelines',
    layers: [
      { id: 'submarine-cables', label: 'Submarine Cables', default: true },
      { id: 'internet-outages', label: 'Internet Outages (IODA)', default: true }
    ]
  },
  physical: {
    id: 'physical',
    label: 'PHYSICAL',
    icon: 'Waves',
    color: '#00ff88',
    description: 'Earthquakes, disasters, wildfires, extreme weather',
    layers: [
      { id: 'earthquakes', label: 'USGS Earthquakes', default: true },
      { id: 'disasters', label: 'GDACS Disaster Alerts', default: true },
      { id: 'wildfires', label: 'Natural Events (EONET)', default: true },
      { id: 'weather-alerts', label: 'Extreme Weather', default: true },
      { id: 'volcanoes', label: 'Volcanic Activity', default: true }
    ]
  }
}

/**
 * Data provenance for each layer, used by the live-status indicator.
 * `feed` matches a seed-meta key suffix exposed by `/health` freshness.
 * `kind`: 'live' (real feed), 'static' (hardcoded reference), 'none' (no source yet).
 */
const LAYER_SOURCES = {
  'conflicts': { kind: 'none' },
  'civil-unrest': { kind: 'none' },
  'satellite-orbits': { kind: 'live', feed: 'satellites-iss' },
  'tension-heatmap': { kind: 'static' },
  'intel-hotspots': { kind: 'static' },
  'military-bases': { kind: 'static' },
  'nuclear-sites': { kind: 'static' },
  'gamma-irradiators': { kind: 'static' },
  'radiation-watch': { kind: 'static' },
  'spaceports': { kind: 'static' },
  'chokepoints': { kind: 'static' },
  'pipelines': { kind: 'static' },
  'adsb-flights': { kind: 'live', feed: 'opensky' },
  'military-flights': { kind: 'live', feed: 'opensky' },
  'aviation-weather': { kind: 'live', feed: 'aviation-weather' },
  'submarine-cables': { kind: 'static' },
  'internet-outages': { kind: 'live', feed: 'ioda-outages' },
  'earthquakes': { kind: 'live', feed: 'usgs-earthquakes' },
  'disasters': { kind: 'live', feed: 'gdacs-alerts' },
  'wildfires': { kind: 'live', feed: 'eonet-natural-events' },
  'weather-alerts': { kind: 'live', feed: 'eonet-natural-events' },
  'volcanoes': { kind: 'live', feed: 'eonet-natural-events' }
}

const DEFAULT_ACTIVE_LAYERS = {
  'conflicts': true,
  'satellite-orbits': true,
  'tension-heatmap': true,
  'intel-hotspots': true,
  'military-bases': true,
  'spaceports': true,
  'chokepoints': true,
  'adsb-flights': true,
  'military-flights': true,
  'aviation-weather': true,
  'submarine-cables': true,
  'internet-outages': true,
  'earthquakes': true,
  'disasters': true,
  'wildfires': true,
  'weather-alerts': true,
  'volcanoes': true
}

export const MapLayerProvider = ({ children }) => {
  const [activeLayers, setActiveLayers] = useState(DEFAULT_ACTIVE_LAYERS)
  const [groupVisibility, setGroupVisibility] = useState({})
  const [layerOpacity, setLayerOpacity] = useState({})
  const [timeRange, setTimeRange] = useState({ start: Date.now() - 86400000, end: Date.now() })

  Object.keys(LAYER_GROUPS).forEach(groupId => {
    if (groupVisibility[groupId] === undefined) {
      setGroupVisibility(prev => ({ ...prev, [groupId]: true }))
    }
  })

  const toggleLayer = useCallback((layerId) => {
    setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }))
  }, [])

  const setLayer = useCallback((layerId, value) => {
    setActiveLayers(prev => ({ ...prev, [layerId]: value }))
  }, [])

  const toggleGroup = useCallback((groupId) => {
    setGroupVisibility(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    const group = LAYER_GROUPS[groupId]
    if (group) {
      const newState = !groupVisibility[groupId]
      setActiveLayers(prev => {
        const next = { ...prev }
        group.layers.forEach(layer => {
          next[layer.id] = newState && layer.default
        })
        return next
      })
    }
  }, [groupVisibility])

  const setGroup = useCallback((groupId, value) => {
    setGroupVisibility(prev => ({ ...prev, [groupId]: value }))
    const group = LAYER_GROUPS[groupId]
    if (group) {
      setActiveLayers(prev => {
        const next = { ...prev }
        group.layers.forEach(layer => {
          next[layer.id] = value && layer.default
        })
        return next
      })
    }
  }, [])

  const setOpacity = useCallback((layerId, opacity) => {
    setLayerOpacity(prev => ({ ...prev, [layerId]: Math.max(0, Math.min(1, opacity)) }))
  }, [])

  const enableAll = useCallback(() => {
    const allLayers = {}
    Object.values(LAYER_GROUPS).forEach(group => {
      group.layers.forEach(layer => {
        allLayers[layer.id] = true
      })
    })
    setActiveLayers(allLayers)
    Object.keys(LAYER_GROUPS).forEach(g => setGroupVisibility(prev => ({ ...prev, [g]: true })))
  }, [])

  const disableAll = useCallback(() => {
    setActiveLayers({})
    Object.keys(LAYER_GROUPS).forEach(g => setGroupVisibility(prev => ({ ...prev, [g]: false })))
  }, [])

  const resetToDefaults = useCallback(() => {
    setActiveLayers(DEFAULT_ACTIVE_LAYERS)
    Object.keys(LAYER_GROUPS).forEach(g => setGroupVisibility(prev => ({ ...prev, [g]: true })))
  }, [])

  const getActiveLayerIds = useCallback(() => {
    return Object.entries(activeLayers).filter(([, v]) => v).map(([k]) => k)
  }, [activeLayers])

  const isLayerActive = useCallback((layerId) => {
    return activeLayers[layerId] === true
  }, [activeLayers])

  const isGroupVisible = useCallback((groupId) => {
    return groupVisibility[groupId] !== false
  }, [groupVisibility])

  const getLayerOpacity = useCallback((layerId) => {
    return layerOpacity[layerId] ?? 1
  }, [layerOpacity])

  const stats = useMemo(() => {
    const active = Object.entries(activeLayers).filter(([, v]) => v).length
    const total = Object.keys(activeLayers).length
    const byGroup = {}
    Object.entries(LAYER_GROUPS).forEach(([groupId, group]) => {
      byGroup[groupId] = group.layers.filter(l => activeLayers[l.id]).length
    })
    return { active, total, byGroup }
  }, [activeLayers])

  return (
    <MapLayerContext.Provider value={{
      layerGroups: LAYER_GROUPS,
      layerSources: LAYER_SOURCES,
      activeLayers,
      groupVisibility,
      layerOpacity,
      timeRange,
      setTimeRange,
      toggleLayer,
      setLayer,
      setActiveLayers,
      toggleGroup,
      setGroup,
      setOpacity,
      enableAll,
      disableAll,
      resetToDefaults,
      getActiveLayerIds,
      isLayerActive,
      isGroupVisible,
      getLayerOpacity,
      stats
    }}>
      {children}
    </MapLayerContext.Provider>
  )
}

export const useMapLayers = () => {
  const context = useContext(MapLayerContext)
  if (!context) {
    throw new Error('useMapLayers must be used within a MapLayerProvider')
  }
  return context
}