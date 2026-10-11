import { Router } from 'express'
import fetch from 'node-fetch'
import {
  createCache,
  cachedFetchJson,
  writeSeedMeta,
  TTL as CACHE_TTL
} from '../cache.js'

const router = Router()

const OPENSKY_URL = 'https://opensky-network.org/api/states/all'
const ADSB_LOL_POINT = 'https://api.adsb.lol/v2/point'
const ADSB_LOL_MIL = 'https://api.adsb.lol/v2/mil'
const ADSBDB_CALLSIGN = 'https://api.adsbdb.com/v0/callsign'
const ADSBDB_AIRCRAFT = 'https://api.adsbdb.com/v0/aircraft'

const FETCH_TIMEOUT = 15000
const OPENSKY_TIMEOUT = 45000

const cache = createCache()

async function fetchJSON(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WorldMonitor/1.0 (OSINT dashboard)' }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

function altitudeFt(baro, geom) {
  if (typeof baro === 'number') return baro
  if (typeof geom === 'number') return geom
  return null
}

function normalizeAdsbLol(ac) {
  if (ac.lat == null || ac.lon == null) return null
  const military = (typeof ac.dbFlags === 'number' && (ac.dbFlags & 1) === 1) ||
    /^(RCH|RRR|REACH|MC|TAB|QID|NATO|GAF|IAM|CFC|JAKE|MAGIC|EXEC|SAM|VENUS)/i.test((ac.flight || '').trim())
  return {
    icao24: ac.hex,
    callsign: (ac.flight || '').trim() || (ac.hex || '').toUpperCase(),
    registration: ac.r || null,
    aircraftType: ac.t || null,
    originCountry: null,
    lat: ac.lat,
    lng: ac.lon,
    altitude: altitudeFt(ac.alt_baro, ac.alt_geom),
    onGround: ac.alt_baro === 'ground',
    velocity: typeof ac.gs === 'number' ? Math.round(ac.gs) : null,
    heading: typeof ac.track === 'number' ? ac.track : 0,
    verticalRate: typeof ac.baro_rate === 'number' ? ac.baro_rate : 0,
    squawk: ac.squawk || null,
    category: ac.category || null,
    military
  }
}

function normalizeOpenSky(row) {
  const [
    icao24, callsign, originCountry, timePosition, lastContact,
    longitude, latitude, baroAltitude, onGround, velocity,
    trueTrack, verticalRate, , geoAltitude, squawk
  ] = row

  if (latitude == null || longitude == null) return null
  const cs = (callsign || '').trim()
  const military = /^(RCH|RRR|REACH|MC|TAB|QID|NATO|GAF|IAM|CFC|JAKE|DELTA|MAGIC)/i.test(cs)

  return {
    icao24,
    callsign: cs || icao24.toUpperCase(),
    registration: null,
    aircraftType: null,
    originCountry,
    lat: latitude,
    lng: longitude,
    altitude: baroAltitude != null ? Math.round(baroAltitude * 3.28084) : (geoAltitude != null ? Math.round(geoAltitude * 3.28084) : null),
    velocity: velocity != null ? Math.round(velocity * 1.94384) : null,
    heading: trueTrack != null ? trueTrack : 0,
    verticalRate: verticalRate != null ? Math.round(verticalRate * 196.85) : 0,
    onGround: !!onGround,
    squawk: squawk || null,
    category: null,
    military,
    lastContact,
    timePosition
  }
}

router.get('/flights', async (req, res) => {
  const lat = parseFloat(req.query.lat)
  const lon = parseFloat(req.query.lon)
  const dist = Math.min(250, Math.max(25, parseInt(req.query.dist, 10) || 250))
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lon)

  if (hasPoint) {
    const cacheKey = `point:${lat.toFixed(2)}:${lon.toFixed(2)}:${dist}`
    try {
      const { data: states, cached } = await cachedFetchJson(
        cache,
        cacheKey,
        async () => {
          const data = await fetchJSON(`${ADSB_LOL_POINT}/${lat}/${lon}/${dist}`)
          const next = Array.isArray(data.ac) ? data.ac.map(normalizeAdsbLol).filter(Boolean) : []
          writeSeedMeta('flights:point', { recordCount: next.length, ttlMs: CACHE_TTL.flights })
          return next
        },
        { ttlMs: CACHE_TTL.flights }
      )
      return res.json({
        states,
        source: 'adsb.lol',
        cached,
        timestamp: Date.now(),
        ...(cached ? {} : { center: { lat, lon }, radiusNm: dist })
      })
    } catch (err) {
      console.error('[flights] adsb.lol point failed:', err.message)
      return res.status(502).json({ states: [], source: 'adsb.lol', error: err.message, timestamp: Date.now() })
    }
  }

  const cacheKey = 'opensky:global'
  try {
    const { data, cached } = await cachedFetchJson(
      cache,
      cacheKey,
      async () => {
        const payload = await fetchJSON(OPENSKY_URL, OPENSKY_TIMEOUT)
        const states = Array.isArray(payload.states) ? payload.states.map(normalizeOpenSky).filter(Boolean) : []
        writeSeedMeta('flights:global', { recordCount: states.length, ttlMs: CACHE_TTL.global })
        return { states, time: payload.time }
      },
      { ttlMs: CACHE_TTL.global }
    )
    return res.json({ states: data.states, source: 'opensky', cached, timestamp: Date.now(), time: data.time })
  } catch (err) {
    console.error('[flights] OpenSky fetch failed:', err.message)
    return res.status(502).json({ states: [], source: 'opensky', error: err.message, timestamp: Date.now() })
  }
})

router.get('/flights/military', async (req, res) => {
  const cacheKey = 'adsblol:mil'
  try {
    const { data: states, cached } = await cachedFetchJson(
      cache,
      cacheKey,
      async () => {
        const data = await fetchJSON(ADSB_LOL_MIL)
        const next = Array.isArray(data.ac) ? data.ac.map(normalizeAdsbLol).filter(Boolean) : []
        writeSeedMeta('flights:military', { recordCount: next.length, ttlMs: CACHE_TTL.flights })
        return next
      },
      { ttlMs: CACHE_TTL.flights }
    )
    res.json({ states, source: 'adsb.lol', cached, timestamp: Date.now() })
  } catch (err) {
    console.error('[flights] adsb.lol military failed:', err.message)
    res.status(502).json({ states: [], error: err.message, timestamp: Date.now() })
  }
})

router.get('/flight-route', async (req, res) => {
  const callsign = (req.query.callsign || '').toString().trim().toUpperCase()
  if (!callsign) return res.status(400).json({ error: 'callsign required' })

  const cacheKey = `route:${callsign}`
  const cached = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const data = await fetchJSON(`${ADSBDB_CALLSIGN}/${encodeURIComponent(callsign)}`)
    const fr = data?.response?.flightroute
    if (!fr) {
      const empty = { found: false, callsign }
      cache.set(cacheKey, empty, CACHE_TTL.route)
      return res.json(empty)
    }
    const result = {
      found: true,
      callsign,
      airline: fr.airline?.name || null,
      origin: fr.origin ? {
        iata: fr.origin.iata_code,
        icao: fr.origin.icao_code,
        name: fr.origin.municipality || fr.origin.name,
        country: fr.origin.country_name,
        lat: fr.origin.latitude,
        lng: fr.origin.longitude
      } : null,
      destination: fr.destination ? {
        iata: fr.destination.iata_code,
        icao: fr.destination.icao_code,
        name: fr.destination.municipality || fr.destination.name,
        country: fr.destination.country_name,
        lat: fr.destination.latitude,
        lng: fr.destination.longitude
      } : null
    }
    cache.set(cacheKey, result, CACHE_TTL.route)
    res.json(result)
  } catch (err) {
    console.error('[flight-route] adsbdb fetch failed:', err.message)
    res.status(502).json({ found: false, callsign, error: err.message })
  }
})

router.get('/aircraft', async (req, res) => {
  const icao24 = (req.query.icao24 || '').toString().trim().toLowerCase()
  if (!icao24) return res.status(400).json({ error: 'icao24 required' })

  const cacheKey = `aircraft:${icao24}`
  const cached = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const data = await fetchJSON(`${ADSBDB_AIRCRAFT}/${encodeURIComponent(icao24)}`)
    const ac = data?.response?.aircraft
    if (!ac) {
      const empty = { found: false, icao24 }
      cache.set(cacheKey, empty, CACHE_TTL.aircraft)
      return res.json(empty)
    }
    const result = {
      found: true,
      icao24,
      registration: ac.registration || null,
      type: ac.type || null,
      icaoType: ac.icao_type || null,
      manufacturer: ac.manufacturer || null,
      owner: ac.registered_owner || null,
      operatorIcao: ac.operator_icao || null,
      photo: ac.url_photo || null
    }
    cache.set(cacheKey, result, CACHE_TTL.aircraft)
    res.json(result)
  } catch (err) {
    console.error('[aircraft] adsbdb fetch failed:', err.message)
    res.status(502).json({ found: false, icao24, error: err.message })
  }
})

export default router
