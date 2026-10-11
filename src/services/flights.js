/**
 * Layer: services (rank 2) — flight data access.
 *
 * Thin per-domain wrappers over the existing Express `/api/*` endpoints.
 * No caching/transform here: the backend owns that. Callers get parsed JSON.
 */
import { requestJson } from './http.js'

/**
 * Live aircraft states.
 * With `{ lat, lng, dist }` the backend uses the fast local adsb.lol feed;
 * without coordinates it falls back to the cached global OpenSky snapshot.
 *
 * @param {{ lat?: number, lng?: number, dist?: number }} [point]
 * @returns {Promise<{ states: import('../types/domain.js').Flight[], source: string, cached: boolean, timestamp: number }>}
 */
export function getFlights(point = {}) {
  const { lat, lng, dist } = point
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng)
  return requestJson('/api/flights', {
    params: hasPoint ? { lat, lon: lng, dist } : undefined
  })
}

/**
 * Military aircraft subset.
 * @returns {Promise<{ states: import('../types/domain.js').Flight[], source: string, cached: boolean, timestamp: number }>}
 */
export function getMilitaryFlights() {
  return requestJson('/api/flights/military')
}

/**
 * Resolve the route (origin/destination) for a callsign.
 * @param {string} callsign
 * @returns {Promise<import('../types/domain.js').FlightRoute>}
 */
export function getFlightRoute(callsign) {
  return requestJson('/api/flight-route', { params: { callsign } })
}

/**
 * Resolve aircraft metadata by ICAO24 hex.
 * @param {string} icao24
 * @returns {Promise<import('../types/domain.js').AircraftInfo>}
 */
export function getAircraft(icao24) {
  return requestJson('/api/aircraft', { params: { icao24 } })
}
