import { Router } from 'express'
import fetch from 'node-fetch'
import { readFileSync } from 'node:fs'
import { promises as dns } from 'node:dns'
import net from 'node:net'
import tls from 'node:tls'
import {
  createCache,
  cachedFetchJson,
  writeSeedMeta,
  TTL as CACHE_TTL
} from '../cache.js'

const router = Router()

const OPENSKY_URL = 'https://opensky-network.org/api/states/all'
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const ADSB_LOL_POINT = 'https://api.adsb.lol/v2/point'
const ADSB_LOL_MIL = 'https://api.adsb.lol/v2/mil'
const ADSBDB_CALLSIGN = 'https://api.adsbdb.com/v0/callsign'
const ADSBDB_AIRCRAFT = 'https://api.adsbdb.com/v0/aircraft'

const FETCH_TIMEOUT = 15000
const OPENSKY_TIMEOUT = 45000

// OpenSky OAuth2 client credentials (server-side secret). On local machines
// they are read from the gitignored credentials.json; on cloud hosts (where
// that file is absent) set OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET env vars.
// Authenticated /states/all returns the full global snapshot in a single
// request, both more complete and far lighter than hub sampling.
let openskyCreds = null
try {
  openskyCreds = JSON.parse(
    readFileSync(new URL('../../credentials.json', import.meta.url), 'utf8')
  )
} catch {
  // no local file — fall through to env vars
}
if ((!openskyCreds?.clientId || !openskyCreds?.clientSecret) && process.env.OPENSKY_CLIENT_ID) {
  openskyCreds = {
    clientId: process.env.OPENSKY_CLIENT_ID,
    clientSecret: process.env.OPENSKY_CLIENT_SECRET
  }
}
if (!openskyCreds?.clientId || !openskyCreds?.clientSecret) {
  openskyCreds = null
  console.warn('[flights] OpenSky credentials not found — auth disabled (falling back to adsb.lol)')
}

// Keyless global aggregation: adsb.lol caps a single /point query at ~1000nm,
// so we sample a set of population centers (India weighted) and merge the union.
// OpenSky remains as a last-resort fallback (frequently rate-limited).
const ADSB_LOL_HUBS = Object.freeze([
  { name: 'Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Mumbai', lat: 19.09, lon: 72.87 },
  { name: 'Bengaluru', lat: 12.97, lon: 77.59 },
  { name: 'Gulf', lat: 25.2, lon: 55.3 },
  { name: 'Europe', lat: 50.0, lon: 10.0 },
  { name: 'SE-Asia', lat: 1.35, lon: 103.8 },
  { name: 'East-Asia', lat: 35.0, lon: 139.0 },
  { name: 'US-East', lat: 38.9, lon: -77.4 },
  { name: 'US-Central', lat: 41.9, lon: -87.6 },
  { name: 'US-West', lat: 34.0, lon: -118.2 },
  { name: 'S-America', lat: -23.5, lon: -46.6 },
  { name: 'Australia', lat: -33.9, lon: 151.2 }
])
const HUB_RADIUS_NM = 1000
const HUB_CONCURRENCY = 2
const GLOBAL_CAP = 8000
const GLOBAL_TTL_MS = 90000

const cache = createCache()

// adsb.lol is free/keyless and rate-limits aggressively. Serialize every
// request through a shared queue with a minimum gap so bursty hub aggregation
// never triggers HTTP 429 on the latency-sensitive local point queries.
const ADSB_MIN_GAP_MS = 500
let adsbQueue = Promise.resolve()
let adsbLastAt = 0

async function adsbFetch(url, timeoutMs = FETCH_TIMEOUT) {
  const run = async () => {
    const gap = ADSB_MIN_GAP_MS - (Date.now() - adsbLastAt)
    if (gap > 0) await new Promise((r) => setTimeout(r, gap))
    adsbLastAt = Date.now()
    try {
      return await fetchJSON(url, timeoutMs)
    } catch (err) {
      if (/HTTP 429/.test(err.message)) {
        await new Promise((r) => setTimeout(r, 1500))
        adsbLastAt = Date.now()
        return await fetchJSON(url, timeoutMs)
      }
      throw err
    }
  }
  const next = adsbQueue.then(run, run)
  adsbQueue = next.catch(() => {})
  return next
}

/** Run `fn` over `items` with bounded concurrency; failures resolve to null. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      try {
        results[idx] = await fn(items[idx])
      } catch {
        results[idx] = null
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function fetchJSON(url, timeoutMs = FETCH_TIMEOUT, headers = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WorldMonitor/1.0 (OSINT dashboard)', ...headers }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

// --- OpenSky OAuth2 (client credentials) ---------------------------------
let openskyToken = { value: null, expiresAt: 0 }
let openskyTokenInflight = null

async function getOpenSkyToken() {
  if (!openskyCreds?.clientId || !openskyCreds?.clientSecret) return null
  if (openskyToken.value && Date.now() < openskyToken.expiresAt - 30000) {
    return openskyToken.value
  }
  if (openskyTokenInflight) return openskyTokenInflight

  openskyTokenInflight = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: openskyCreds.clientId,
        client_secret: openskyCreds.clientSecret
      })
      const res = await fetch(OPENSKY_TOKEN_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      })
      if (!res.ok) throw new Error(`token HTTP ${res.status}`)
      const data = await res.json()
      if (!data.access_token) throw new Error('no access_token')
      openskyToken = {
        value: data.access_token,
        expiresAt: Date.now() + (Number(data.expires_in) || 1800) * 1000
      }
      return openskyToken.value
    } finally {
      clearTimeout(timeout)
      openskyTokenInflight = null
    }
  })()
  return openskyTokenInflight
}

async function fetchOpenSkyAuthed() {
  let token
  try {
    token = await getOpenSkyToken()
  } catch (err) {
    throw new Error(`token stage: ${err.name}: ${err.message}${err.cause?.message ? ` / ${err.cause.message}` : ''}`)
  }
  if (!token) throw new Error('OpenSky auth unavailable')
  try {
    return await fetchJSON(OPENSKY_URL, OPENSKY_TIMEOUT, { Authorization: `Bearer ${token}` })
  } catch (err) {
    throw new Error(`states stage: ${err.name}: ${err.message}${err.cause?.message ? ` / ${err.cause.message}` : ''}`)
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
          const data = await adsbFetch(`${ADSB_LOL_POINT}/${lat}/${lon}/${dist}`)
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

  // Primary: OpenSky authenticated full-global snapshot (one request for all
  // states worldwide). Requires credentials.json (server-side secret).
  if (openskyCreds?.clientId && openskyCreds?.clientSecret) {
    try {
      const { data, cached } = await cachedFetchJson(
        cache,
        'opensky:global',
        async () => {
          const payload = await fetchOpenSkyAuthed()
          const states = Array.isArray(payload.states) ? payload.states.map(normalizeOpenSky).filter(Boolean) : []
          if (!states.length) throw new Error('OpenSky returned no states')
          writeSeedMeta('flights:global', { recordCount: states.length, ttlMs: CACHE_TTL.global })
          return { states, time: payload.time }
        },
        { ttlMs: CACHE_TTL.global }
      )
      return res.json({ states: data.states, source: 'opensky', cached, timestamp: Date.now(), time: data.time })
    } catch (err) {
      console.error('[flights] OpenSky authenticated failed, falling back to adsb.lol:', err.message)
    }
  }

  // Fallback: keyless adsb.lol hub aggregation (India-weighted).
  const cacheKey = 'adsblol:global'
  try {
    const { data, cached } = await cachedFetchJson(
      cache,
      cacheKey,
      async () => {
        const batches = await mapLimit(ADSB_LOL_HUBS, HUB_CONCURRENCY, async (hub) => {
          const payload = await adsbFetch(`${ADSB_LOL_POINT}/${hub.lat}/${hub.lon}/${HUB_RADIUS_NM}`)
          return Array.isArray(payload.ac) ? payload.ac.map(normalizeAdsbLol).filter(Boolean) : []
        })

        const byHex = new Map()
        for (const batch of batches) {
          if (!batch) continue
          for (const s of batch) if (!byHex.has(s.icao24)) byHex.set(s.icao24, s)
        }

        // Merge the global military feed (flagged as military even without a callsign heuristic).
        try {
          const mil = await adsbFetch(ADSB_LOL_MIL)
          for (const ac of Array.isArray(mil.ac) ? mil.ac : []) {
            const s = normalizeAdsbLol(ac)
            if (!s) continue
            s.military = true
            if (!byHex.has(s.icao24)) byHex.set(s.icao24, s)
          }
        } catch { /* military feed optional */ }

        const states = Array.from(byHex.values())
        if (!states.length) throw new Error('all adsb.lol hubs empty')
        writeSeedMeta('flights:global', { recordCount: states.length, ttlMs: GLOBAL_TTL_MS })
        return { states: states.slice(0, GLOBAL_CAP), time: Date.now() }
      },
      { ttlMs: GLOBAL_TTL_MS }
    )
    return res.json({ states: data.states, source: 'adsb.lol', cached, timestamp: Date.now(), time: data.time })
  } catch (err) {
    console.error('[flights] adsb.lol global aggregation failed:', err.message)
    return res.status(502).json({ states: [], source: 'adsb.lol', error: err.message, timestamp: Date.now() })
  }
})

router.get('/flights/military', async (req, res) => {
  const cacheKey = 'adsblol:mil'
  try {
    const { data: states, cached } = await cachedFetchJson(
      cache,
      cacheKey,
      async () => {
        const data = await adsbFetch(ADSB_LOL_MIL)
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

// TEMP diagnostic for OpenSky reachability from this host — remove after use.
const tcpTest = (host, port = 443, timeout = 8000) =>
  new Promise((resolve) => {
    const t = Date.now()
    const sock = net.connect(port, host)
    const done = (ok, extra = {}) => {
      try { sock.destroy() } catch { /* ignore */ }
      resolve({ ok, ms: Date.now() - t, ...extra })
    }
    sock.setTimeout(timeout)
    sock.on('connect', () => done(true))
    sock.on('timeout', () => done(false, { error: 'timeout' }))
    sock.on('error', (e) => done(false, { error: e.code || e.message }))
  })

const tlsTest = (host, timeout = 8000) =>
  new Promise((resolve) => {
    const t = Date.now()
    const sock = tls.connect({ host, port: 443, servername: host })
    const done = (ok, extra = {}) => {
      try { sock.destroy() } catch { /* ignore */ }
      resolve({ ok, ms: Date.now() - t, ...extra })
    }
    sock.setTimeout(timeout)
    sock.on('secureConnect', () => done(true, { authorized: sock.authorized }))
    sock.on('timeout', () => done(false, { error: 'timeout' }))
    sock.on('error', (e) => done(false, { error: e.code || e.message }))
  })

router.get('/_diag/opensky', async (req, res) => {
  const out = { host: process.env.RENDER_SERVICE_NAME || 'local', hasCreds: Boolean(openskyCreds?.clientId) }
  const timeIt = async (fn) => {
    const t = Date.now()
    try {
      const r = await fn()
      return { ok: true, ms: Date.now() - t, ...r }
    } catch (e) {
      return { ok: false, ms: Date.now() - t, name: e.name, error: e.message, code: e.code, cause: e.cause?.message || e.cause?.code }
    }
  }
  try {
    out.dns = await dns.lookup('opensky-network.org', { all: true })
  } catch (e) {
    out.dns = `err: ${e.message}`
  }
  out.tcp_opensky = await tcpTest('194.209.200.34')
  out.tcp_control = await tcpTest('api.adsb.lol')
  out.tls_auth_opensky = await tlsTest('auth.opensky-network.org')
  out.tls_opensky = await tlsTest('opensky-network.org')

  const probe = async (url) => {
    const controller = new AbortController()
    const to = setTimeout(() => controller.abort(), 8000)
    const t = Date.now()
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: '*/*' }
      })
      return { ok: res.ok, status: res.status, ms: Date.now() - t }
    } catch (e) {
      return { ok: false, ms: Date.now() - t, name: e.name, error: e.message }
    } finally {
      clearTimeout(to)
    }
  }
  out.tcp_yahoo = await tcpTest('query1.finance.yahoo.com')
  out.yahoo = await probe('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=5m&range=1d')
  out.tcp_youtube = await tcpTest('www.youtube.com')
  out.youtube_oembed = await probe(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=SChm4DyivOU')}&format=json`)

  out.token = await timeIt(async () => ({ tokenLen: (await getOpenSkyToken())?.length || 0 }))
  out.states = await timeIt(async () => {
    const r = await fetchJSON(OPENSKY_URL, OPENSKY_TIMEOUT, { Authorization: `Bearer ${await getOpenSkyToken()}` })
    return { count: Array.isArray(r.states) ? r.states.length : null }
  })
  res.json(out)
})

export default router
