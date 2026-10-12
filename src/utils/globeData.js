/**
 * Layer: utils (rank 1) — globe data adapter.
 *
 * Normalises existing events + static reference data into the single marker
 * shape the canvas globe consumes:
 *   { id, lat, lng, severity, layer, title, summary, duration, sourceCount }
 * No new fetches: everything already flows through EventContext.
 */
import { MARITIME_CHOKEPOINTS } from './constants.js'
import { CHOKEPOINTS } from './dashboardData.js'
import landMask from '../data/landMask.json'

export const GLOBE_LAYERS = [
  { id: 'conflict', label: 'Conflict' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'maritime', label: 'Maritime' },
  { id: 'aviation', label: 'Aviation' },
  { id: 'seismic', label: 'Seismic' },
  { id: 'outages', label: 'Outages' }
]

export const SEVERITY_COLOR = {
  critical: '#FF5E4F',
  high: '#F0AE4B',
  medium: '#7CD3EA',
  info: '#7E93A6'
}

export const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, info: 3 }

const CATEGORY_LAYER = {
  conflict: 'conflict',
  unrest: 'conflict',
  'cisa-kev': 'cyber',
  c2: 'cyber',
  phishing: 'cyber',
  malware: 'cyber',
  ais: 'maritime',
  chokepoint: 'maritime',
  'dark-fleet': 'maritime',
  flight: 'aviation',
  'military-flight': 'aviation',
  'aviation-weather': 'aviation',
  earthquake: 'seismic',
  volcano: 'seismic',
  'internet-outage': 'outages',
  'power-grid': 'outages'
}

const CHOKE_STATUS_SEVERITY = { critical: 'critical', caution: 'high', nominal: 'medium' }

const CHOKE_ID_ALIAS = {
  suez: 'suez',
  hormuz: 'hormuz',
  bab: 'bab-el-mandeb',
  malacca: 'malacca',
  panama: 'panama',
  bosphorus: 'bosphorus'
}

export const layerForCategory = (category) => CATEGORY_LAYER[category] || null

export function buildGlobePoints(events, { limit = 420 } = {}) {
  const live = []
  if (events) {
    for (const e of events.values()) {
      if (e.geo === false || e.lat == null || e.lng == null) continue
      const layer = CATEGORY_LAYER[e.category]
      if (!layer) continue
      live.push({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        severity: e.severity || 'info',
        layer,
        title: e.title || 'Untitled',
        summary: e.details?.summary || e.details?.description || e.details?.location || '',
        duration: e.details?.duration || null,
        sourceCount: e.details?.sourceCount || 1,
        timestamp: e.timestamp || Date.now()
      })
    }
  }
  live.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.timestamp - a.timestamp)

  // Static maritime reference points (transit counts are static — see data note).
  const statsById = new Map(CHOKEPOINTS.map((c) => [c.id, c]))
  const statics = MARITIME_CHOKEPOINTS.map((cp) => {
    const key = Object.keys(CHOKE_ID_ALIAS).find((k) => CHOKE_ID_ALIAS[k] === cp.id)
    const meta = key ? statsById.get(key) : null
    return {
      id: `choke-${cp.id}`,
      lat: cp.lat,
      lng: cp.lng,
      severity: CHOKE_STATUS_SEVERITY[meta?.status] || 'medium',
      layer: 'maritime',
      title: cp.name,
      summary: meta ? `${meta.transit} transits · static reference` : 'Chokepoint',
      duration: null,
      sourceCount: 1,
      static: true,
      timestamp: Date.now()
    }
  })

  return live.slice(0, limit).concat(statics)
}

export function countByLayer(points) {
  const counts = {}
  for (const l of GLOBE_LAYERS) counts[l.id] = 0
  for (const p of points) counts[p.layer] = (counts[p.layer] || 0) + 1
  return counts
}

/**
 * Decode the baked 1.8° land bitmask into flat unit-vector trig pairs:
 * [cosLat, sinLat, cosLon, sinLon, ...] (4 floats per cell). Precomputed so
 * the render loop does pure arithmetic per dot.
 */
export function landVectors(mask = landMask) {
  const bin = atob(mask.land)
  const out = []
  const d2r = Math.PI / 180
  for (let j = 0; j < mask.latCount; j++) {
    const lat = (90 - (j + 0.5) * mask.step) * d2r
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)
    for (let i = 0; i < mask.lonCount; i++) {
      const n = j * mask.lonCount + i
      if (!(bin.charCodeAt(n >> 3) & (1 << (7 - (n & 7))))) continue
      const lon = (-180 + (i + 0.5) * mask.step) * d2r
      out.push(cosLat, sinLat, Math.cos(lon), Math.sin(lon))
    }
  }
  return Float32Array.from(out)
}

export const LAND_MASK_META = { step: landMask.step, lonCount: landMask.lonCount, latCount: landMask.latCount }