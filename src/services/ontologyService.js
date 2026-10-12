/**
 * Layer: services (rank 2) — Defense OSDK-style ontology data layer.
 *
 * Centralised, in-memory "ontology" store that models standardised interface
 * schemas so every disparate feed (aviation, cyber, maritime, geopolitics,
 * disasters) shares ONE unified data contract. React components never touch
 * raw feed shapes — they query/mutate entities through this service.
 *
 * Design goals (mirrors an Ontology SDK):
 *   - Typed entity kinds (MajorEndItem, IntelAsset, ThreatEntity, ...).
 *   - Deterministic adapters that fuse raw feed records -> entities.
 *   - A queryable + mutable graph with typed relationships.
 *   - Observable store (subscribe) so the UI can render without prop drilling.
 *
 * This module is pure JS (no React, no DOM). It imports only from
 * utils/helpers (rank 1).
 */
import { getCountryName } from '../utils/helpers.js'

/** Canonical entity kinds for the defence ontology. */
export const EntityType = Object.freeze({
  MAJOR_END_ITEM: 'MajorEndItem', // platforms: aircraft, vessels, launchers
  INTEL_ASSET: 'IntelAsset', // sensors, satellites, feeds
  THREAT_ENTITY: 'ThreatEntity', // cyber actors, ransomware groups, IOCs
  INCIDENT: 'Incident', // disasters, outages, conflicts, quakes
  FACILITY: 'Facility', // bases, spaceports, airports, cables
  ORGANIZATION: 'Organization', // groups, operators, agencies
  LOCATION: 'Location', // countries / geographies
  IDENTITY: 'Identity' // callsigns, registrations, IPs, hashes
})

/** Targeting-HUD classification — drives outline colour on the map. */
export const Classification = Object.freeze({
  FRIENDLY: 'friendly',
  HOSTILE: 'hostile',
  NEUTRAL: 'neutral',
  UNKNOWN: 'unknown'
})

/** Typed relationship edges between entities. */
export const RelationType = Object.freeze({
  LOCATED_IN: 'located_in',
  OPERATES: 'operates',
  IDENTIFIED_BY: 'identified_by',
  AFFILIATED: 'affiliated',
  INDICATES: 'indicates',
  TARGETS: 'targets',
  DERIVED_FROM: 'derived_from'
})

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, info: 3, nominal: 4 }

/** Declarative schema registry — the "interface" contract per entity type. */
export const SCHEMAS = Object.freeze({
  MajorEndItem: {
    label: 'Major End Item',
    props: ['platform', 'kind', 'operator', 'flag', 'status', 'altitude', 'velocity', 'heading']
  },
  IntelAsset: {
    label: 'Intel Asset',
    props: ['sensorClass', 'band', 'status', 'taskedTarget', 'orchestrator']
  },
  ThreatEntity: {
    label: 'Threat Entity',
    props: ['threatClass', 'indicator', 'group', 'confidence', 'mitre']
  },
  Incident: {
    label: 'Incident',
    props: ['incidentClass', 'magnitude', 'impact', 'alertLevel']
  },
  Facility: {
    label: 'Facility',
    props: ['facilityClass', 'operator', 'capacity']
  },
  Organization: {
    label: 'Organization',
    props: ['orgClass', 'sector', 'affiliation']
  },
  Location: {
    label: 'Location',
    props: ['iso2', 'admin', 'population']
  },
  Identity: {
    label: 'Identity',
    props: ['idClass', 'value', 'confidence']
  }
})

let seq = 0
const nextId = (type) => `ent:${type}:${(++seq).toString(36)}`

/** Build a fully-formed entity from a partial, with sane defaults. */
function makeEntity(type, src = {}) {
  const now = Date.now()
  const id = src.id || nextId(type)
  return {
    id,
    type,
    label: src.label || 'UNKNOWN',
    subtitle: src.subtitle || '',
    lat: typeof src.lat === 'number' ? src.lat : null,
    lng: typeof src.lng === 'number' ? src.lng : null,
    geocode: src.geocode !== false && typeof src.lat === 'number' && typeof src.lng === 'number',
    severity: src.severity || 'info',
    classification: src.classification || Classification.UNKNOWN,
    countryCode: src.countryCode || null,
    props: src.props || {},
    tags: src.tags || [],
    source: src.source || 'ontology',
    timestamp: src.timestamp || now,
    provenance: src.provenance || { feed: src.source || 'ontology', rawId: src.id || null }
  }
}

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/* ------------------------------------------------------------------ *
 * Adapters: raw feed record -> ontology entity(ies)
 * ------------------------------------------------------------------ */

/** Aircraft / vessel / platform -> MajorEndItem. */
export function asMajorEndItem(flight) {
  const military = !!flight.military
  return makeEntity(EntityType.MAJOR_END_ITEM, {
    id: `mei:air:${flight.icao24}`,
    label: clean(flight.callsign) || (flight.icao24 || '').toUpperCase(),
    subtitle: [clean(flight.originCountry), clean(flight.aircraftType)].filter(Boolean).join(' · ') || 'Air platform',
    lat: flight.lat,
    lng: flight.lng,
    severity: military ? 'high' : 'info',
    classification: military ? Classification.UNKNOWN : Classification.NEUTRAL,
    source: 'adsb.lol',
    timestamp: Date.now(),
    tags: military ? ['air', 'military'] : ['air', 'civil'],
    props: {
      platform: 'air',
      kind: clean(flight.aircraftType) || 'unknown',
      operator: clean(flight.originCountry) || '—',
      flag: clean(flight.registration) || '—',
      status: flight.onGround ? 'ground' : 'airborne',
      altitude: flight.altitude,
      velocity: flight.velocity,
      heading: flight.heading
    },
    provenance: { feed: 'flights', rawId: flight.icao24 }
  })
}

/** Callsign identity node for a platform. */
export function asCallsignIdentity(flight) {
  const cs = clean(flight.callsign)
  if (!cs) return null
  return makeEntity(EntityType.IDENTITY, {
    id: `idn:callsign:${cs.toUpperCase()}`,
    label: cs.toUpperCase(),
    subtitle: 'Callsign',
    severity: 'info',
    classification: flight.military ? Classification.UNKNOWN : Classification.NEUTRAL,
    source: 'adsb.lol',
    tags: ['identity', 'callsign'],
    props: { idClass: 'callsign', value: cs, confidence: 0.9 },
    provenance: { feed: 'flights', rawId: cs }
  })
}

/** Simulated sensor / satellite / radar -> IntelAsset. */
export function asIntelAsset(sensor) {
  return makeEntity(EntityType.INTEL_ASSET, {
    id: sensor.id || `ass:${(sensor.label || 'sensor').toLowerCase().replace(/\s+/g, '-')}`,
    label: sensor.label || 'SENSOR',
    subtitle: sensor.subtitle || 'Collection asset',
    lat: sensor.lat,
    lng: sensor.lng,
    severity: 'info',
    classification: Classification.FRIENDLY,
    source: sensor.source || 'tasking',
    tags: ['sensor', sensor.sensorClass || 'eo'],
    props: {
      sensorClass: sensor.sensorClass || 'EO/IR',
      band: sensor.band || '—',
      status: sensor.status || 'standby',
      taskedTarget: sensor.taskedTarget || null,
      orchestrator: sensor.orchestrator || 'AIP'
    },
    provenance: { feed: 'sensor-tasking', rawId: sensor.id || null }
  })
}

/** Cyber / ransomware / vulnerability -> ThreatEntity (+ optional indicator). */
export function asThreatEntity(event) {
  const d = event.details || {}
  const isRansom = event.category === 'ransomware'
  const indicator = clean(d.ip) || clean(d.domain) || clean(d.url) || clean(d.ioc) || clean(d.file_hash)
  return makeEntity(EntityType.THREAT_ENTITY, {
    id: `thr:${event.id}`,
    label: event.title || (isRansom ? 'Ransomware victim' : 'Threat indicator'),
    subtitle: [clean(d.group || d.threat_type || d.malware), event.countryCode ? getCountryName(event.countryCode) : null]
      .filter(Boolean)
      .join(' · ') || 'Cyber threat',
    lat: event.lat,
    lng: event.lng,
    severity: event.severity || 'medium',
    classification: Classification.HOSTILE,
    countryCode: event.countryCode || null,
    source: event.source,
    timestamp: event.timestamp,
    tags: ['cyber', event.category].filter(Boolean),
    props: {
      threatClass: event.category || 'cyber',
      indicator: indicator || '—',
      group: clean(d.group || d.threat_type) || '—',
      confidence: clean(d.confidence) || 'medium',
      mitre: clean(d.mitre) || '—'
    },
    provenance: { feed: event.source, rawId: event.id }
  })
}

export function asIndicatorIdentity(event) {
  const d = event.details || {}
  const kind = d.ip ? 'ip' : d.domain ? 'domain' : d.url ? 'url' : d.file_hash ? 'hash' : null
  const value = d.ip || d.domain || d.url || d.file_hash
  if (!kind || !value) return null
  return makeEntity(EntityType.IDENTITY, {
    id: `idn:${kind}:${value}`,
    label: String(value),
    subtitle: `${kind.toUpperCase()} indicator`,
    severity: event.severity || 'medium',
    classification: Classification.HOSTILE,
    source: event.source,
    timestamp: event.timestamp,
    tags: ['identity', 'indicator', kind],
    props: { idClass: kind, value: String(value), confidence: 'medium' },
    provenance: { feed: event.source, rawId: event.id }
  })
}

/** Natural disaster / outage / conflict -> Incident (neutral). */
export function asIncident(event) {
  const d = event.details || {}
  return makeEntity(EntityType.INCIDENT, {
    id: `inc:${event.id}`,
    label: event.title || 'Incident',
    subtitle: [event.category, event.countryCode ? getCountryName(event.countryCode) : null].filter(Boolean).join(' · ') || 'Event',
    lat: event.lat,
    lng: event.lng,
    severity: event.severity || 'medium',
    classification: Classification.NEUTRAL,
    countryCode: event.countryCode || null,
    source: event.source,
    timestamp: event.timestamp,
    tags: ['incident', event.category].filter(Boolean),
    props: {
      incidentClass: event.category || 'event',
      magnitude: d.magnitude ?? d.alertLevel ?? '—',
      impact: d.impact || d.severity || '—',
      alertLevel: d.alertLevel || event.severity || '—'
    },
    provenance: { feed: event.source, rawId: event.id }
  })
}

/** Country -> Location node. */
export function asLocation(iso2, coords) {
  return makeEntity(EntityType.LOCATION, {
    id: `loc:${iso2}`,
    label: getCountryName(iso2) || iso2,
    subtitle: `ISO ${iso2}`,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    severity: 'info',
    classification: Classification.NEUTRAL,
    countryCode: iso2,
    source: 'ontology',
    tags: ['location', 'country'],
    props: { iso2, admin: '—', population: '—' },
    provenance: { feed: 'ontology', rawId: iso2 }
  })
}

/** Ransomware / threat group -> Organization node. */
export function asOrganization(name, event) {
  const key = String(name).trim().toUpperCase()
  return makeEntity(EntityType.ORGANIZATION, {
    id: `org:${key.replace(/[^A-Z0-9]+/g, '-')}`,
    label: key,
    subtitle: 'Threat group',
    severity: event?.severity || 'high',
    classification: Classification.HOSTILE,
    source: event?.source || 'ontology',
    tags: ['organization', 'threat-group'],
    props: { orgClass: 'ransomware', sector: 'cyber', affiliation: 'hostile' },
    provenance: { feed: event?.source || 'ontology', rawId: key }
  })
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

const state = {
  entities: new Map(),
  edges: new Map(), // key "a|b|rel" -> { from, to, rel, ts }
  version: 0,
  listeners: new Set()
}

function notify() {
  state.version++
  for (const fn of state.listeners) {
    try {
      fn(state.version)
    } catch {
      /* listener isolation */
    }
  }
}

function edgeKey(a, b, rel) {
  return `${a}|${b}|${rel}`
}

export const ontology = {
  subscribe(fn) {
    state.listeners.add(fn)
    return () => state.listeners.delete(fn)
  },

  getVersion() {
    return state.version
  },

  /** Insert or merge a single entity. */
  upsert(entity, { silent = false } = {}) {
    if (!entity?.id) return null
    const prev = state.entities.get(entity.id)
    const merged = prev ? { ...prev, ...entity, props: { ...prev.props, ...entity.props } } : entity
    state.entities.set(entity.id, merged)
    if (!silent) notify()
    return merged
  },

  upsertMany(entities) {
    let n = 0
    for (const e of entities) {
      if (e?.id) {
        this.upsert(e, { silent: true })
        n++
      }
    }
    if (n) notify()
    return n
  },

  get(id) {
    return state.entities.get(id) || null
  },

  all() {
    return Array.from(state.entities.values())
  },

  size() {
    return state.entities.size
  },

  remove(id) {
    const had = state.entities.delete(id)
    if (had) {
      for (const key of Array.from(state.edges.keys())) {
        if (key.startsWith(`${id}|`) || key.includes(`|${id}|`)) state.edges.delete(key)
      }
      notify()
    }
    return had
  },

  /** Bulk removal with a single notification (used for retention pruning). */
  removeMany(ids) {
    let n = 0
    for (const id of ids) {
      if (state.entities.delete(id)) {
        n++
        for (const key of Array.from(state.edges.keys())) {
          if (key.startsWith(`${id}|`) || key.includes(`|${id}|`)) state.edges.delete(key)
        }
      }
    }
    if (n) notify()
    return n
  },

  /** Create a typed relationship between two entities (idempotent). */
  link(from, to, rel, { silent = false } = {}) {
    if (!from || !to || from === to) return false
    const key = edgeKey(from, to, rel)
    if (state.edges.has(key)) return false
    if (!state.entities.has(from) || !state.entities.has(to)) return false
    state.edges.set(key, { from, to, rel, ts: Date.now() })
    if (!silent) notify()
    return true
  },

  unlink(from, to, rel) {
    const key = edgeKey(from, to, rel)
    const had = state.edges.delete(key)
    if (had) notify()
    return had
  },

  linksOf(id) {
    const out = []
    for (const e of state.edges.values()) {
      if (e.from === id) out.push({ ...e, direction: 'out', other: e.to })
      else if (e.to === id) out.push({ ...e, direction: 'in', other: e.from })
    }
    return out
  },

  edges() {
    return Array.from(state.edges.values())
  },

  /** Structured query with type/text/classification/severity/bbox filters. */
  query({ types, text, classification, severity, minSeverity, bbox, tags, limit = 200 } = {}) {
    const maxRank = minSeverity != null ? SEVERITY_RANK[minSeverity] : null
    const term = text ? String(text).toLowerCase().trim() : null
    const typeSet = types && types.length ? new Set(types) : null
    const classSet = classification && classification.length ? new Set(classification) : null
    const sevSet = severity && severity.length ? new Set(severity) : null
    const tagSet = tags && tags.length ? new Set(tags) : null
    const out = []
    for (const e of state.entities.values()) {
      if (typeSet && !typeSet.has(e.type)) continue
      if (classSet && !classSet.has(e.classification)) continue
      if (sevSet && !sevSet.has(e.severity)) continue
      if (maxRank != null && (SEVERITY_RANK[e.severity] ?? 9) > maxRank) continue
      if (tagSet && !e.tags.some((t) => tagSet.has(t))) continue
      if (bbox) {
        const { minLat, maxLat, minLng, maxLng } = bbox
        if (e.lat == null || e.lng == null) continue
        if (e.lat < minLat || e.lat > maxLat || e.lng < minLng || e.lng > maxLng) continue
      }
      if (term) {
        const hay = `${e.label} ${e.subtitle} ${e.type} ${e.countryCode || ''} ${e.tags.join(' ')} ${Object.values(e.props || {}).join(' ')}`.toLowerCase()
        if (!hay.includes(term)) continue
      }
      out.push(e)
    }
    out.sort((a, b) => {
      const s = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
      if (s !== 0) return s
      return (b.timestamp || 0) - (a.timestamp || 0)
    })
    return out.slice(0, limit)
  },

  /** Breadth-first neighbourhood around an entity, up to `depth` hops. */
  graph(id, depth = 1) {
    if (!state.entities.has(id)) return { root: id, nodes: [], edges: [] }
    const visited = new Set([id])
    const nodes = new Set([id])
    const edges = []
    let frontier = [id]
    for (let d = 0; d < depth; d++) {
      const next = []
      for (const cur of frontier) {
        for (const link of this.linksOf(cur)) {
          edges.push(link)
          if (!visited.has(link.other)) {
            visited.add(link.other)
            nodes.add(link.other)
            next.push(link.other)
          }
        }
      }
      frontier = next
      if (!frontier.length) break
    }
    return {
      root: id,
      nodes: Array.from(nodes).map((n) => state.entities.get(n)).filter(Boolean),
      edges
    }
  },

  /** Infer relationships across the current entity set. */
  correlate() {
    let created = 0
    const add = (a, b, rel) => {
      if (this.link(a, b, rel, { silent: true })) created++
    }
    const list = Array.from(state.entities.values())
    const locations = new Map()
    for (const e of list) {
      if (e.type === EntityType.LOCATION) locations.set(e.countryCode, e.id)
    }
    for (const e of list) {
      if (e.type === EntityType.LOCATION) continue
      // Country roll-up.
      if (e.countryCode && locations.has(e.countryCode)) {
        add(e.id, locations.get(e.countryCode), RelationType.LOCATED_IN)
      }
      // Threat group affiliation.
      if (e.type === EntityType.THREAT_ENTITY && e.props?.group && e.props.group !== '—') {
        const orgId = `org:${String(e.props.group).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`
        if (state.entities.has(orgId)) add(e.id, orgId, RelationType.AFFILIATED)
      }
    }
    // Callsign identity for platforms.
    for (const e of list) {
      if (e.type === EntityType.MAJOR_END_ITEM && e.label) {
        const idn = `idn:callsign:${e.label.toUpperCase()}`
        if (state.entities.has(idn)) add(e.id, idn, RelationType.IDENTIFIED_BY)
      }
    }
    if (created) notify()
    return created
  },

  stats() {
    const byType = {}
    const byClassification = {}
    let geo = 0
    for (const e of state.entities.values()) {
      byType[e.type] = (byType[e.type] || 0) + 1
      byClassification[e.classification] = (byClassification[e.classification] || 0) + 1
      if (e.geocode) geo++
    }
    return { total: state.entities.size, edges: state.edges.size, geo, byType, byClassification }
  },

  clear() {
    state.entities.clear()
    state.edges.clear()
    notify()
  }
}

/**
 * Task a simulated collection asset against a target coordinate. Returns the
 * created IntelAsset entity (clearly labelled `simulated`). This is a
 * deterministic simulation of automated sensor cueing — no real tasking.
 */
export function createSensorTasking({ lat, lng, targetLabel, sensorClass = 'EO/IR' }) {
  const asset = asIntelAsset({
    label: `SENSOR-${String(Math.abs(Math.round(lat * 100) + Math.round(lng * 100))).padStart(4, '0')}`,
    subtitle: targetLabel ? `Cued → ${targetLabel}` : 'Cued collection',
    lat,
    lng,
    sensorClass,
    band: sensorClass === 'SAR' ? 'X-band' : 'VIS/NIR',
    status: 'tasking',
    taskedTarget: targetLabel || null,
    source: 'sensor-tasking (simulated)'
  })
  ontology.upsert(asset)
  return asset
}

export default ontology
