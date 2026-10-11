import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useUI } from './UIContext.jsx'
import { getFlights, getFlightRoute, getAircraft } from '../services/flights.js'

const FlightContext = createContext(null)

const DELHI = { lat: 28.6139, lng: 77.2090, name: 'New Delhi, India' }
const GLOBAL_POLL_MS = 60000
const RADAR_POLL_MS = 12000

export const FlightProvider = ({ children }) => {
  const { mapRef, globeRef, mapMode } = useUI()
  const [flights, setFlights] = useState([])
  const [source, setSource] = useState(null)
  const [radar, setRadar] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [route, setRoute] = useState(null)
  const [aircraftInfo, setAircraftInfo] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(0)
  const [rangeVisible, setRangeVisible] = useState(true)

  const radarRef = useRef(radar)
  radarRef.current = radar

  const fetchFlights = useCallback(async () => {
    setLoading(true)
    try {
      const r = radarRef.current
      const data = r
        ? await getFlights({ lat: r.lat, lng: r.lng, dist: r.dist || 200 })
        : await getFlights()
      if (Array.isArray(data.states) && data.states.length) {
        setFlights(data.states)
        setSource(data.source)
        setLastUpdate(Date.now())
        setError(null)
      } else if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchFlights()
    const delay = radar ? RADAR_POLL_MS : GLOBAL_POLL_MS
    const interval = setInterval(() => {
      if (!cancelled) fetchFlights()
    }, delay)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [radar, fetchFlights])

  const locateUser = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setUserLocation(DELHI)
        return resolve(DELHI)
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Current Location' }
          setUserLocation(loc)
          resolve(loc)
        },
        () => {
          setUserLocation(DELHI)
          resolve(DELHI)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    })
  }, [])

  const flyTo = useCallback((lat, lng, zoom = 7) => {
    if (mapMode === '3D' && globeRef?.current) {
      globeRef.current.flyTo({ center: [lng, lat], zoom, duration: 1500 })
      return
    }
    const map = mapRef?.current
    if (map) {
      map.flyTo([lat, lng], zoom, { duration: 1.5 })
    }
  }, [mapRef, globeRef, mapMode])

  const activateRadar = useCallback(async (lat, lng, dist = 200) => {
    const loc = { lat, lng, dist }
    setRadar(loc)
    setRangeVisible(true)
    flyTo(lat, lng, dist <= 60 ? 9 : 7)
  }, [flyTo])

  const flyToUser = useCallback(async () => {
    const loc = await locateUser()
    await activateRadar(loc.lat, loc.lng, 200)
    return loc
  }, [locateUser, activateRadar])

  const flyToDelhi = useCallback(async () => {
    setUserLocation((prev) => prev || DELHI)
    await activateRadar(DELHI.lat, DELHI.lng, 200)
    return DELHI
  }, [activateRadar])

  const clearRadar = useCallback(() => {
    setRadar(null)
  }, [])

  const selectFlight = useCallback(async (flight) => {
    if (!flight) {
      setSelectedId(null)
      setRoute(null)
      setAircraftInfo(null)
      return
    }
    setSelectedId(flight.icao24)
    setRoute(null)
    setAircraftInfo(null)
    try {
      const cs = (flight.callsign || '').trim()
      if (cs) {
        const rj = await getFlightRoute(cs)
        if (rj.found) setRoute(rj)
      }
    } catch { /* route unavailable */ }
    try {
      const aj = await getAircraft(flight.icao24)
      if (aj.found) setAircraftInfo(aj)
    } catch { /* aircraft info unavailable */ }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setRoute(null)
    setAircraftInfo(null)
  }, [])

  const selectedFlight = flights.find(f => f.icao24 === selectedId) || null

  return (
    <FlightContext.Provider value={{
      flights,
      source,
      radar,
      selectedId,
      selectedFlight,
      route,
      aircraftInfo,
      userLocation,
      loading,
      error,
      lastUpdate,
      rangeVisible,
      setRangeVisible,
      fetchFlights,
      locateUser,
      flyTo,
      activateRadar,
      flyToUser,
      flyToDelhi,
      clearRadar,
      selectFlight,
      clearSelection,
      DELHI
    }}>
      {children}
    </FlightContext.Provider>
  )
}

export const useFlights = () => {
  const context = useContext(FlightContext)
  if (!context) {
    throw new Error('useFlights must be used within a FlightProvider')
  }
  return context
}
