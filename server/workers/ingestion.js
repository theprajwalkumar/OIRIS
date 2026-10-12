import fetch from 'node-fetch'
import { readFileSync } from 'node:fs'
import { broadcast, broadcastToAll } from '../index.js'
import { createCache, writeSeedMeta, TTL } from '../cache.js'

const FETCH_TIMEOUT = 15000
const CACHE_TTL = TTL.ingestion
const SCHEDULER_INTERVAL_MS = 10000
const MAX_RETRIES = 3

const cache = createCache()
const circuitBreakers = new Map()
// Rolling set of ids already broadcast, so a 10s tick only pushes deltas
// instead of re-sending cached events to every client each cycle.
const broadcastSeen = new Set()
let cycleRunning = false

// Real ISO-3166 alpha-2 country centroids (generated from the Google dspl
// canonical countries dataset). Used to place keyless, country-level feeds
// (e.g. IODA outages) on the map without an API key.
const COUNTRY_CENTROIDS = JSON.parse(
  readFileSync(new URL('../data/country-centroids.json', import.meta.url), 'utf8')
)

// EONET category -> internal { category, type }
const EONET_CATEGORY_MAP = {
  wildfires: { category: 'wildfire', type: 'wildfire' },
  severeStorms: { category: 'weather', type: 'storm' },
  volcanoes: { category: 'volcano', type: 'volcano' },
  floods: { category: 'flood', type: 'flood' },
  drought: { category: 'drought', type: 'drought' },
  dustHaze: { category: 'dust', type: 'dust' },
  seaLakeIce: { category: 'ice', type: 'ice' },
  landslides: { category: 'landslide', type: 'landslide' },
  earthquakes: { category: 'earthquake', type: 'earthquake' },
  temperatureExtremes: { category: 'weather', type: 'heatwave' },
  snow: { category: 'weather', type: 'snow' },
  waterColor: { category: 'other', type: 'waterColor' },
  manmade: { category: 'other', type: 'manmade' }
}

function severityFromStormKts(kts) {
  if (typeof kts !== 'number') return 'info'
  if (kts >= 113) return 'critical'
  if (kts >= 64) return 'high'
  if (kts >= 34) return 'medium'
  return 'info'
}

function eonetSeverity(mapped, magnitudeValue, unit) {
  if (unit === 'kts') return severityFromStormKts(magnitudeValue)
  switch (mapped.category) {
    case 'volcano': return 'high'
    case 'wildfire':
    case 'flood':
    case 'drought': return 'medium'
    default: return 'info'
  }
}

function getCache(key) {
  return cache.get(key)
}

/**
 * Per-feed cache TTL (ms). The scheduler ticks every SCHEDULER_INTERVAL_MS but
 * a feed only re-fetches upstream once its TTL elapses, so fast-changing feeds
 * (ISS, flights) refresh near-real-time while slow datasets (CISA KEV, EONET,
 * GDACS) are not hammered — protecting free/keyless upstreams from rate limits.
 */
const FEED_TTL = {
  'satellites-iss': 8000,
  'military-flights': 60000,
  'usgs-earthquakes': 60000,
  'aviation-weather': 300000,
  'eonet-natural-events': 180000,
  'gdacs-alerts': 180000,
  'ioda-outages': 120000,
  'threatfox': 300000,
  'urlhaus': 300000,
  'cisa-kev': 21600000,
  'space-weather': 300000,
  'ransomware': 600000
}

function setCache(key, data) {
  const ttlMs = FEED_TTL[key] ?? CACHE_TTL
  cache.set(key, data, ttlMs)
  // A real upstream fetch just happened: record freshness (seed-meta).
  writeSeedMeta(key, {
    recordCount: Array.isArray(data) ? data.length : null,
    ttlMs
  })
}

function isCircuitOpen(service) {
  const breaker = circuitBreakers.get(service)
  if (!breaker) return false
  if (breaker.failures >= 5 && Date.now() - breaker.lastFailure < 60000) {
    return true
  }
  if (Date.now() - breaker.lastFailure > 60000) {
    circuitBreakers.delete(service)
  }
  return false
}

function recordFailure(service) {
  const breaker = circuitBreakers.get(service) || { failures: 0, lastFailure: 0 }
  breaker.failures++
  breaker.lastFailure = Date.now()
  circuitBreakers.set(service, breaker)
}

function recordSuccess(service) {
  circuitBreakers.delete(service)
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
      // Don't retry 4xx (e.g. 429 rate limits): retrying just burns the tick.
      if (response.status >= 400 && response.status < 500) error.noRetry = true
      throw error
    }
    
    return await response.json()
  } catch (error) {
    clearTimeout(timeout)
    if (retries > 0 && !error.noRetry && error.name !== 'AbortError') {
      await new Promise(r => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getSeverityFromMagnitude(mag) {
  if (mag >= 7) return 'critical'
  if (mag >= 5) return 'high'
  if (mag >= 3) return 'medium'
  return 'info'
}

async function fetchUSGSEarthquakes() {
  if (isCircuitOpen('usgs')) return []
  
  try {
    const cached = getCache('usgs-earthquakes')
    if (cached) return cached
    
    const data = await fetchWithRetry('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson')
    
    const events = data.features
      .filter(f => f.geometry && f.properties)
      .map(f => {
        const props = f.properties
        const coords = f.geometry.coordinates
        const mag = props.mag || 0
        
        return {
          id: generateEventId(),
          lat: coords[1],
          lng: coords[0],
          severity: getSeverityFromMagnitude(mag),
          type: 'earthquake',
          category: 'earthquake',
          title: `M${mag.toFixed(1)} Earthquake`,
          details: {
            magnitude: mag,
            depth: coords[2],
            location: props.place,
            tsunami: props.tsunami === 1,
            alert: props.alert,
            url: props.url,
            time: props.time
          },
          source: 'USGS',
          timestamp: props.time,
          countryCode: extractCountryCode(props.place)
        }
      })
    
    setCache('usgs-earthquakes', events)
    recordSuccess('usgs')
    return events
  } catch (error) {
    console.error('USGS fetch error:', error.message)
    recordFailure('usgs')
    return []
  }
}

async function fetchCISAKEV() {
  if (isCircuitOpen('cisa')) return []
  
  try {
    const cached = getCache('cisa-kev')
    if (cached) return cached
    
    const data = await fetchWithRetry('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json')
    
    const events = data.vulnerabilities
      .filter(v => v.cveID)
      .slice(0, 50)
      .map(v => {

        return {
          id: generateEventId(),
          lat: null,
          lng: null,
          geo: false,
          severity: 'high',
          type: 'cisa-kev',
          category: 'cisa-kev',
          title: `CVE-${v.cveID}`,
          details: {
            cveId: v.cveID,
            vendor: v.vendorProject,
            product: v.product,
            vulnerability: v.vulnerabilityName,
            description: v.shortDescription,
            requiredAction: v.requiredAction,
            dueDate: v.dueDate,
            dateAdded: v.dateAdded
          },
          source: 'CISA KEV',
          timestamp: new Date(v.dateAdded).getTime() || Date.now(),
          countryCode: null
        }
      })
    
    setCache('cisa-kev', events)
    recordSuccess('cisa')
    return events
  } catch (error) {
    console.error('CISA KEV fetch error:', error.message)
    recordFailure('cisa')
    return []
  }
}

async function fetchThreatFox() {
  if (isCircuitOpen('threatfox')) return []
  
  try {
    const cached = getCache('threatfox')
    if (cached) return cached
    
    const response = await fetchWithRetry('https://threatfox.abuse.ch/export/json/recent/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'get_iocs', days: 1 })
    })
    
    let data = response
    if (response.data) data = response.data
    if (!Array.isArray(data)) data = []
    
    const events = data
      .filter(ioc => ioc && (ioc.ioc_type === 'ip:port' || ioc.ioc_type === 'ip'))
      .slice(0, 100)
      .map(ioc => {

        return {
          id: generateEventId(),
          lat: null,
          lng: null,
          geo: false,
          severity: 'critical',
          type: 'c2',
          category: 'c2',
          title: `C2: ${ioc.malware || 'Unknown'}`,
          details: {
            ioc: ioc.ioc,
            iocType: ioc.ioc_type,
            malware: ioc.malware,
            confidence: ioc.confidence_level,
            tags: ioc.tags,
            reporter: ioc.reporter,
            firstSeen: ioc.first_seen,
            lastSeen: ioc.last_seen
          },
          source: 'ThreatFox',
          timestamp: new Date(ioc.first_seen).getTime() || Date.now(),
          countryCode: null
        }
      })
    
    setCache('threatfox', events)
    recordSuccess('threatfox')
    return events
  } catch (error) {
    console.error('ThreatFox fetch error:', error.message)
    recordFailure('threatfox')
    return []
  }
}

async function fetchURLhaus() {
  if (isCircuitOpen('urlhaus')) return []
  
  try {
    const cached = getCache('urlhaus')
    if (cached) return cached
    
    const response = await fetchWithRetry('https://urlhaus.abuse.ch/downloads/json_online/')
    
    let data = response
    if (Array.isArray(response)) data = response
    else if (response && typeof response === 'object') {
      // Handle object with array property
      const keys = Object.keys(response)
      if (keys.length > 0 && Array.isArray(response[keys[0]])) {
        data = response[keys[0]]
      } else if (keys.length > 0 && typeof response[keys[0]] === 'object') {
        data = Object.values(response)
      } else {
        data = []
      }
    } else {
      data = []
    }
    
    const events = data
      .filter(h => h && h.url_status === 'online')
      .slice(0, 100)
      .map(h => {

        return {
          id: generateEventId(),
          lat: null,
          lng: null,
          geo: false,
          severity: 'high',
          type: 'phishing',
          category: 'phishing',
          title: `Phishing: ${h.threat || h.url || 'Unknown'}`,
          details: {
            url: h.url,
            threat: h.threat,
            tags: h.tags,
            urlhausLink: h.urlhaus_link,
            dateAdded: h.date_added
          },
          source: 'URLhaus',
          timestamp: new Date(h.date_added).getTime() || Date.now(),
          countryCode: null
        }
      })
    
    setCache('urlhaus', events)
    recordSuccess('urlhaus')
    return events
  } catch (error) {
    console.error('URLhaus fetch error:', error.message)
    recordFailure('urlhaus')
    return []
  }
}

async function fetchMilitaryFlights() {
  if (isCircuitOpen('adsb-mil')) return []

  try {
    const cached = getCache('military-flights')
    if (cached) return cached

    // Keyless global military ADS-B feed (adsb.lol). Replaces the old OpenSky
    // call, which was rate-limited into silence.
    const data = await fetchWithRetry('https://api.adsb.lol/v2/mil')

    const ac = Array.isArray(data.ac) ? data.ac : []
    const events = ac
      .filter(a => a.lat != null && a.lon != null && a.alt_baro !== 'ground')
      .slice(0, 300)
      .map(a => {
        const callsign = (a.flight || '').trim() || (a.hex || '').toUpperCase()
        const altBaro = typeof a.alt_baro === 'number' ? a.alt_baro : null
        const altGeom = typeof a.alt_geom === 'number' ? a.alt_geom : null
        return {
          id: `mil-${a.hex}`,
          lat: a.lat,
          lng: a.lon,
          severity: 'high',
          type: 'military-flight',
          category: 'military-flight',
          title: `${callsign} ● MIL`,
          details: {
            icao24: a.hex,
            callsign,
            registration: a.r || null,
            aircraftType: a.t || null,
            altitude: altBaro ?? altGeom ?? 0,
            velocity: typeof a.gs === 'number' ? Math.round(a.gs) : 0,
            heading: typeof a.track === 'number' ? Math.round(a.track) : 0,
            verticalRate: typeof a.baro_rate === 'number' ? a.baro_rate : 0,
            squawk: a.squawk || null,
            military: true
          },
          source: 'adsb.lol',
          timestamp: Date.now(),
          countryCode: null
        }
      })

    setCache('military-flights', events)
    recordSuccess('adsb-mil')
    return events
  } catch (error) {
    console.error('adsb.lol military fetch error:', error.message)
    recordFailure('adsb-mil')
    return []
  }
}

async function fetchSpaceWeather() {
  if (isCircuitOpen('swpc')) return []

  try {
    const cached = getCache('space-weather')
    if (cached) return cached

    const now = new Date()
    const events = []

    // Current geomagnetic/solar/radio storm scales (0-5). Only emitted when
    // elevated, so quiet days do not manufacture fake incidents.
    try {
      const scales = await fetchWithRetry('https://services.swpc.noaa.gov/products/noaa-scales.json')
      const current = scales?.['0'] || {}
      const defs = [
        ['R', 'Radio blackout'],
        ['S', 'Solar radiation storm'],
        ['G', 'Geomagnetic storm']
      ]
      for (const [key, label] of defs) {
        const entry = current[key]
        const scale = parseInt(entry?.Scale, 10)
        if (!entry || !Number.isFinite(scale) || scale <= 0) continue
        events.push({
          id: `swpc-${key}`,
          lat: 0,
          lng: 0,
          geo: false,
          severity: scale >= 4 ? 'critical' : scale >= 2 ? 'high' : 'medium',
          type: 'space-weather',
          category: 'space-weather',
          title: `${label}: ${key}${scale} · ${entry.Text || 'elevated'}`,
          details: { scale, scaleKey: key, text: entry.Text || null, dateStamp: current.DateStamp, timeStamp: current.TimeStamp },
          source: 'NOAA SWPC',
          timestamp: now.getTime(),
          countryCode: null
        })
      }
    } catch (e) {
      console.error('SWPC scales error:', e.message)
    }

    // Always-on informational status (current X-ray flare class).
    try {
      const flares = await fetchWithRetry('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json')
      const latest = Array.isArray(flares) ? flares[flares.length - 1] : null
      if (latest) {
        events.push({
          id: 'swpc-xray',
          lat: 0,
          lng: 0,
          geo: false,
          severity: 'info',
          type: 'space-weather',
          category: 'space-weather',
          title: `Solar X-ray flux: ${latest.current_class || latest.max_class || '—'}`,
          details: { currentClass: latest.current_class, maxClass: latest.max_class, satellite: latest.satellite },
          source: 'NOAA SWPC',
          timestamp: Date.parse(latest.time_tag) || now.getTime(),
          countryCode: null
        })
      }
    } catch (e) {
      console.error('SWPC xray error:', e.message)
    }

    if (!events.length) return []
    setCache('space-weather', events)
    recordSuccess('swpc')
    return events
  } catch (error) {
    console.error('Space weather fetch error:', error.message)
    recordFailure('swpc')
    return []
  }
}

async function fetchRansomware() {
  if (isCircuitOpen('ransomware')) return []

  try {
    const cached = getCache('ransomware')
    if (cached) return cached

    const data = await fetchWithRetry('https://api.ransomware.live/v2/recentvictims')
    const list = Array.isArray(data) ? data : []

    const events = list.slice(0, 120).map((v, i) => {
      const cc = (v.country || '').toUpperCase()
      const centroid = cc ? COUNTRY_CENTROIDS[cc] : null
      const parsed = Date.parse(v.attackdate || v.discovered)
      const victim = v.post_title || v.victim || v.domain || `victim-${i}`
      return {
        id: `ransom-${v.group || 'unknown'}-${victim}-${parsed || i}`,
        lat: centroid ? centroid[0] : 0,
        lng: centroid ? centroid[1] : 0,
        geo: !!centroid,
        severity: 'medium',
        type: 'ransomware',
        category: 'ransomware',
        title: `${v.group || 'Unknown'} → ${victim}`,
        details: {
          group: v.group || null,
          victim,
          domain: v.domain || null,
          country: cc || null,
          sector: v.activity || null,
          description: v.description || null,
          claimUrl: v.claim_url || null
        },
        source: 'ransomware.live',
        timestamp: Number.isFinite(parsed) ? parsed : Date.now(),
        countryCode: cc || null
      }
    })

    setCache('ransomware', events)
    recordSuccess('ransomware')
    return events
  } catch (error) {
    console.error('ransomware.live fetch error:', error.message)
    recordFailure('ransomware')
    return []
  }
}

async function fetchEONET() {
  if (isCircuitOpen('eonet')) return []

  try {
    const cached = getCache('eonet-natural-events')
    if (cached) return cached

    const data = await fetchWithRetry('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7&limit=200')

    const events = (data.events || []).flatMap(ev => {
      const geom = Array.isArray(ev.geometry) ? ev.geometry[ev.geometry.length - 1] : null
      if (!geom || geom.type !== 'Point') return []
      const [lng, lat] = geom.coordinates || []
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

      const eonetCategory = ev.categories?.[0]?.id || 'other'
      const mapped = EONET_CATEGORY_MAP[eonetCategory] || { category: 'other', type: eonetCategory }
      const provider = ev.sources?.[0]?.id || 'EONET'

      return [{
        id: `eonet-${ev.id}`,
        lat,
        lng,
        severity: eonetSeverity(mapped, geom.magnitudeValue, geom.magnitudeUnit),
        type: mapped.type,
        category: mapped.category,
        title: ev.title,
        details: {
          eonetCategory,
          magnitude: geom.magnitudeValue ?? null,
          unit: geom.magnitudeUnit ?? null,
          observedAt: geom.date,
          provider,
          url: ev.link
        },
        source: 'NASA EONET',
        timestamp: geom.date ? Date.parse(geom.date) : Date.now(),
        countryCode: null
      }]
    })

    setCache('eonet-natural-events', events)
    recordSuccess('eonet')
    return events
  } catch (error) {
    console.error('EONET fetch error:', error.message)
    recordFailure('eonet')
    return []
  }
}

async function fetchGDACS() {
  if (isCircuitOpen('gdacs')) return []

  try {
    const cached = getCache('gdacs-alerts')
    if (cached) return cached

    const iso = (d) => d.toISOString().slice(0, 10)
    const to = new Date()
    const from = new Date(Date.now() - 7 * 86400000)
    const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=${iso(from)}&toDate=${iso(to)}&alertlevel=Green;Orange;Red`

    const data = await fetchWithRetry(url)

    const events = (data.features || []).flatMap(f => {
      const p = f.properties || {}
      const coords = f.geometry?.coordinates
      if (!Array.isArray(coords)) return []
      const [lng, lat] = coords
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

      const severity = p.alertlevel === 'Red' ? 'critical' : p.alertlevel === 'Orange' ? 'high' : 'medium'
      const iso2 = p.affectedcountries?.[0]?.iso2 || null

      return [{
        id: `gdacs-${p.eventtype}-${p.eventid}-${p.episodeid}`,
        lat,
        lng,
        severity,
        type: `gdacs-${(p.eventtype || '').toLowerCase()}`,
        category: 'disaster',
        title: p.name || p.description || `${p.eventtype || 'Disaster'} alert`,
        details: {
          eventType: p.eventtype,
          alertLevel: p.alertlevel,
          alertScore: p.alertscore,
          country: p.country,
          fromDate: p.fromdate,
          toDate: p.todate,
          provider: p.source,
          url: p.url?.report || p.url?.details || null
        },
        source: 'GDACS',
        timestamp: p.datemodified ? Date.parse(p.datemodified) : Date.now(),
        countryCode: iso2
      }]
    })

    setCache('gdacs-alerts', events)
    recordSuccess('gdacs')
    return events
  } catch (error) {
    console.error('GDACS fetch error:', error.message)
    recordFailure('gdacs')
    return []
  }
}

async function fetchIODA() {
  if (isCircuitOpen('ioda')) return []

  try {
    const cached = getCache('ioda-outages')
    if (cached) return cached

    const until = Math.floor(Date.now() / 1000)
    const from = until - 86400
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/outages/events?from=${from}&until=${until}&entityType=country&limit=200`

    const data = await fetchWithRetry(url)

    // Dedupe by country, keeping the highest-scoring event.
    const best = new Map()
    for (const o of data.data || []) {
      const match = /^country\/([A-Z]{2})$/.exec(o.location || '')
      if (!match) continue
      const iso2 = match[1]
      if (!COUNTRY_CENTROIDS[iso2]) continue
      const prev = best.get(iso2)
      if (!prev || (o.score || 0) > (prev.score || 0)) best.set(iso2, o)
    }

    const events = Array.from(best.entries()).map(([iso2, o]) => {
      const [lat, lng] = COUNTRY_CENTROIDS[iso2]
      const severity = o.score >= 100000 ? 'critical' : o.score >= 30000 ? 'high' : 'medium'
      return {
        id: `ioda-${iso2}-${o.start}`,
        lat,
        lng,
        severity,
        type: 'internet-outage',
        category: 'internet-outage',
        title: `Internet disruption: ${o.location_name || iso2}`,
        details: {
          entity: o.location,
          datasource: o.datasource,
          method: o.method,
          score: Math.round(o.score || 0),
          durationSec: o.duration,
          start: o.start
        },
        source: 'IODA',
        timestamp: o.start * 1000,
        countryCode: iso2
      }
    })

    setCache('ioda-outages', events)
    recordSuccess('ioda')
    return events
  } catch (error) {
    console.error('IODA fetch error:', error.message)
    recordFailure('ioda')
    return []
  }
}

// Live ISS ground position + orbital elements (WhereTheISS.at, keyless).
const ISS_NORAD_ID = 25544
// Heavy lookups (TLE + projected ground track) refresh far less often than the
// 10s position poll, so the fast tick stays cheap.
const ISS_STATIC_TTL = 300000
const issStatic = { tles: null, track: [], fetchedAt: 0 }

async function fetchSatellites() {
  if (isCircuitOpen('iss')) return []

  try {
    const cached = getCache('satellites-iss')
    if (cached) return cached

    const base = `https://api.wheretheiss.at/v1/satellites/${ISS_NORAD_ID}`
    const pos = await fetchWithRetry(base)
    if (!pos || pos.error || !Number.isFinite(pos.latitude) || !Number.isFinite(pos.longitude)) {
      recordSuccess('iss')
      return []
    }

    if (Date.now() - issStatic.fetchedAt > ISS_STATIC_TTL) {
      const [tles, pts] = await Promise.all([
        fetchWithRetry(`${base}/tles`).catch(() => null),
        fetchWithRetry(
          `${base}/positions?timestamps=${Array.from({ length: 16 }, (_, i) => Math.floor(Date.now() / 1000) + i * 360).join(',')}&units=kilometers`
        ).catch(() => [])
      ])
      issStatic.tles = tles
      issStatic.track = (Array.isArray(pts) ? pts : [])
        .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map(p => [p.latitude, p.longitude])
      issStatic.fetchedAt = Date.now()
    }

    const timestamp = (pos.timestamp || Math.floor(Date.now() / 1000)) * 1000
    const events = [{
      id: `satellite-${ISS_NORAD_ID}`,
      lat: pos.latitude,
      lng: pos.longitude,
      severity: 'info',
      type: 'iss',
      category: 'satellite',
      title: 'ISS (ZARYA) — Live Orbit',
      details: {
        noradId: ISS_NORAD_ID,
        altitudeKm: Math.round(pos.altitude * 100) / 100,
        velocityKmh: Math.round(pos.velocity),
        visibility: pos.visibility,
        footprintKm: Math.round(pos.footprint),
        tleLine1: issStatic.tles?.line1 || null,
        tleLine2: issStatic.tles?.line2 || null,
        track: issStatic.track
      },
      source: 'WhereTheISS.at',
      timestamp,
      countryCode: null
    }]

    setCache('satellites-iss', events)
    recordSuccess('iss')
    return events
  } catch (error) {
    console.error('ISS fetch error:', error.message)
    recordFailure('iss')
    return []
  }
}

// Adverse aviation weather (METAR flight category) at major hubs — keyless NOAA.
const METAR_STATIONS = [
  'KJFK', 'KLAX', 'KORD', 'KATL', 'KDFW', 'KSFO', 'CYYZ',
  'EGLL', 'LFPG', 'EDDF', 'EHAM', 'LEMD', 'LIRF', 'EGKK',
  'UUEE', 'UKBB', 'LTFM', 'OMDB', 'OTHH', 'OEJN', 'OIIE',
  'LLBG', 'HECA', 'FAOR', 'VIDP', 'VABB', 'VHHH', 'WSSS',
  'RJTT', 'RKSI', 'ZBAA', 'ZSPD', 'YSSY', 'SBGR', 'SAEZ', 'MMMX'
]

async function fetchAviationWeather() {
  if (isCircuitOpen('metar')) return []

  try {
    const cached = getCache('aviation-weather')
    if (cached) return cached

    const url = `https://aviationweather.gov/api/data/metar?ids=${METAR_STATIONS.join(',')}&format=json&hours=2`
    const data = await fetchWithRetry(url)

    const events = (Array.isArray(data) ? data : []).flatMap(m => {
      const cat = m.fltCat
      if (!cat || cat === 'VFR') return []
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lon)) return []

      const severity = cat === 'LIFR' ? 'critical' : cat === 'IFR' ? 'high' : 'medium'
      const station = m.icaoId || m.stationId || 'UNKNOWN'
      const place = m.name ? m.name.split(',')[0] : ''

      return [{
        id: `metar-${station}`,
        lat: m.lat,
        lng: m.lon,
        severity,
        type: 'metar',
        category: 'aviation-weather',
        title: `${cat} — ${station}${place ? ` (${place})` : ''}`,
        details: {
          icao: station,
          flightCategory: cat,
          wind: Number.isFinite(m.wdir) ? `${m.wdir}° @ ${m.wspd} kt` : (Number.isFinite(m.wspd) ? `${m.wspd} kt` : null),
          visibility: m.visib ?? null,
          cloudCover: m.clouds?.[0]?.cover || m.cover || null,
          ceilingFt: m.clouds?.[0]?.base ?? null,
          temperatureC: m.temp ?? null,
          dewpointC: m.dewp ?? null,
          conditions: m.wxString || null,
          raw: m.rawOb || null
        },
        source: 'NOAA Aviation Weather',
        timestamp: (m.obsTime || Math.floor(Date.now() / 1000)) * 1000,
        countryCode: null
      }]
    })

    setCache('aviation-weather', events)
    recordSuccess('metar')
    return events
  } catch (error) {
    console.error('METAR fetch error:', error.message)
    recordFailure('metar')
    return []
  }
}

function extractCountryCode(place) {
  const countries = {
    'japan': 'JP', 'china': 'CN', 'united states': 'US', 'russia': 'RU',
    'india': 'IN', 'indonesia': 'ID', 'mexico': 'MX', 'iran': 'IR',
    'turkey': 'TR', 'chile': 'CL', 'peru': 'PE', 'philippines': 'PH',
    'italy': 'IT', 'greece': 'GR', 'new zealand': 'NZ', 'iceland': 'IS',
    'papua new guinea': 'PG', 'solomon islands': 'SB', 'vanuatu': 'VU',
    'fiji': 'FJ', 'tonga': 'TO', 'samoa': 'WS', 'alaska': 'US',
    'california': 'US', 'hawaii': 'US', 'puerto rico': 'PR'
  }
  
  const lower = place.toLowerCase()
  for (const [key, code] of Object.entries(countries)) {
    if (lower.includes(key)) return code
  }
  return null
}

const FEED_KEYS = [
  'usgs-earthquakes',
  'eonet-natural-events',
  'gdacs-alerts',
  'ioda-outages',
  'satellites-iss',
  'aviation-weather',
  'cisa-kev',
  'threatfox',
  'urlhaus',
  'military-flights',
  'space-weather',
  'ransomware'
]

/**
 * Union of the currently cached feed arrays. Used to backfill a freshly
 * connected WS client (the 10s loop only broadcasts deltas).
 * @returns {Array<object>}
 */
function getEventSnapshot() {
  return FEED_KEYS.flatMap(key => cache.get(key) || [])
}

async function runIngestionCycle() {
  if (cycleRunning) {
    console.log('[INGESTION] Skipping cycle (previous still running)')
    return
  }
  cycleRunning = true
  console.log('[INGESTION] Starting data ingestion cycle...')
  const startTime = Date.now()
  
  try {
    const results = await Promise.allSettled([
      fetchUSGSEarthquakes(),
      fetchEONET(),
      fetchGDACS(),
      fetchIODA(),
      fetchSatellites(),
      fetchAviationWeather(),
      fetchCISAKEV(),
      fetchThreatFox(),
      fetchURLhaus(),
      fetchMilitaryFlights(),
      fetchSpaceWeather(),
      fetchRansomware()
    ])

    const allEvents = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))

    // Delta-only: cached repeats keep the same id+timestamp and are dropped,
    // while a genuine refetch (new position/records) carries a new timestamp
    // and is broadcast. Keeps 10s ticks cheap without spamming clients.
    const fresh = []
    const freshSigs = []
    for (const e of allEvents) {
      if (!e || !e.id) continue
      const sig = `${e.id}|${e.timestamp ?? ''}`
      if (broadcastSeen.has(sig)) continue
      freshSigs.push(sig)
      fresh.push(e)
    }

    if (fresh.length > 0) {
      if (broadcastSeen.size + freshSigs.length > 20000) broadcastSeen.clear()
      for (const sig of freshSigs) broadcastSeen.add(sig)
      broadcastToAll(fresh)
      console.log(`[INGESTION] Broadcast ${fresh.length} new events (${allEvents.length} seen) to ${global.clients?.size || 0} clients`)
    }

    const duration = Date.now() - startTime
    console.log(`[INGESTION] Cycle completed in ${duration}ms`)

  } catch (error) {
    console.error('[INGESTION] Cycle error:', error)
  } finally {
    cycleRunning = false
  }
}

function startIngestionScheduler() {
  console.log(`[SCHEDULER] Starting ingestion scheduler (every ${SCHEDULER_INTERVAL_MS}ms)...`)

  runIngestionCycle()

  setInterval(runIngestionCycle, SCHEDULER_INTERVAL_MS)
  
  setInterval(() => {
    broadcast('stats', {
      connectedClients: global.clients?.size || 0,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cacheSize: cache.size(),
      circuitBreakers: Object.fromEntries(circuitBreakers)
    })
  }, 30000)
}

export {
  startIngestionScheduler,
  runIngestionCycle,
  getEventSnapshot,
  fetchUSGSEarthquakes,
  fetchEONET,
  fetchGDACS,
  fetchIODA,
  fetchSatellites,
  fetchAviationWeather,
  fetchCISAKEV,
  fetchThreatFox,
  fetchURLhaus,
  fetchMilitaryFlights,
  fetchSpaceWeather,
  fetchRansomware
}
