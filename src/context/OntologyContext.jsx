/**
 * Layer: context (rank 3) — Ontology / Command Suite provider.
 *
 * Fuses the live EventContext + FlightContext feeds into the OSDK ontology
 * store, and exposes a clean command API (query / mutate / classify / task)
 * plus the Command Suite UI state and the immutable audit trail.
 *
 * Components consume this via `useOntology()` — they never read raw feed
 * formats. All mutations are audited.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react'
import { useEvents } from './EventContext.jsx'
import { useFlights } from './FlightContext.jsx'
import { useUI } from './UIContext.jsx'
import {
  ontology,
  createSensorTasking,
  asMajorEndItem,
  asCallsignIdentity,
  asThreatEntity,
  asIndicatorIdentity,
  asIncident,
  asLocation,
  asOrganization,
  EntityType,
  Classification
} from '../services/ontologyService.js'
import { auditLog } from '../services/auditLog.js'

const OntologyContext = createContext(null)

const EVENT_ENTITY_CAP = 600
const FLIGHT_ENTITY_CAP = 400
const RETENTION = {
  [EntityType.MAJOR_END_ITEM]: 600,
  [EntityType.THREAT_ENTITY]: 900,
  [EntityType.INCIDENT]: 900,
  [EntityType.IDENTITY]: 1200
}

const CYBER_CATEGORIES = new Set(['threat', 'cyber', 'vulnerability', 'malware', 'phishing', 'ransomware'])

/** Prune oldest entities of a type beyond its retention cap. Returns ids. */
function overflowIds(type, cap) {
  const list = ontology.all().filter((e) => e.type === type)
  if (list.length <= cap) return []
  list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  return list.slice(0, list.length - cap).map((e) => e.id)
}

export const OntologyProvider = ({ children }) => {
  const { events } = useEvents()
  const { flights } = useFlights()
  const { addToast } = useUI()
  const [version, bump] = useReducer((x) => (x + 1) % 1e9, 0)
  const lastIngestRef = useRef(0)
  const lastPruneRef = useRef(0)

  const [suite, setSuite] = useState({
    nav: true,
    explorer: false,
    aip: false,
    targeting: false,
    audit: false
  })
  const [selectedEntityId, setSelectedEntityId] = useState(null)

  // Re-render on ontology + audit changes.
  useEffect(() => ontology.subscribe(() => bump()), [])
  useEffect(() => auditLog.subscribe(() => bump()), [])

  const setSelectedEntity = useCallback((id) => setSelectedEntityId(id || null), [])

  const toggleSuite = useCallback((key, force) => {
    setSuite((prev) => ({ ...prev, [key]: force !== undefined ? force : !prev[key] }))
  }, [])

  /* ---------------- Ingestion: raw feeds -> entities ---------------- */

  useEffect(() => {
    if (!events || events.size === 0) return
    const now = Date.now()
    if (now - lastIngestRef.current < 2500) return
    lastIngestRef.current = now

    const list = Array.from(events.values())
    const recent = list.slice(-EVENT_ENTITY_CAP)
    const entities = []
    const locations = new Map()
    const groups = new Map()

    for (const ev of recent) {
      if (!ev || ev.lat == null || ev.lng == null) continue
      if (CYBER_CATEGORIES.has(ev.category)) {
        const threat = asThreatEntity(ev)
        entities.push(threat)
        const indicator = asIndicatorIdentity(ev)
        if (indicator) entities.push(indicator)
        const group = ev.details?.group
        if (group) {
          groups.set(String(group).toUpperCase(), ev)
          entities.push(asOrganization(group, ev))
        }
      } else {
        entities.push(asIncident(ev))
      }
      if (ev.countryCode) {
        const cur = locations.get(ev.countryCode)
        if (!cur) locations.set(ev.countryCode, { lat: ev.lat, lng: ev.lng })
      }
    }
    for (const [iso2, coords] of locations) entities.push(asLocation(iso2, coords))

    const changed = ontology.upsertMany(entities)
    if (changed) ontology.correlate()

    // Retention pruning (throttled).
    if (now - lastPruneRef.current > 30000) {
      lastPruneRef.current = now
      const remove = []
      for (const [type, cap] of Object.entries(RETENTION)) remove.push(...overflowIds(type, cap))
      if (remove.length) ontology.removeMany(remove)
    }
  }, [events])

  useEffect(() => {
    if (!Array.isArray(flights) || flights.length === 0) return
    const list = flights
      .filter((f) => typeof f.lat === 'number' && typeof f.lng === 'number')
      .slice()
      .sort((a, b) => Number(b.military) - Number(a.military))
      .slice(0, FLIGHT_ENTITY_CAP)
    const entities = []
    for (const f of list) {
      entities.push(asMajorEndItem(f))
      const idn = asCallsignIdentity(f)
      if (idn) entities.push(idn)
    }
    const changed = ontology.upsertMany(entities)
    if (changed) ontology.correlate()
  }, [flights])

  /* ---------------- Read API ---------------- */

  const entities = useMemo(() => ontology.all(), [version])
  const stats = useMemo(() => ontology.stats(), [version])

  const query = useCallback((filter) => ontology.query(filter), [])
  const getEntity = useCallback((id) => ontology.get(id), [])
  const graph = useCallback((id, depth = 1) => ontology.graph(id, depth), [])

  /* ---------------- Mutations (audited) ---------------- */

  const classify = useCallback((id, classification, label) => {
    const ent = ontology.get(id)
    if (!ent) return false
    ontology.upsert({ ...ent, classification })
    auditLog.record({
      actor: auditLog.ACTOR.OPERATOR,
      action: 'CLASSIFY',
      target: label || ent.label,
      detail: `Reclassified → ${classification}`
    })
    addToast?.({ message: `Reclassified ${label || ent.label} → ${classification}`, type: 'success' })
    return true
  }, [addToast])

  const tagEntity = useCallback((id, tag) => {
    const ent = ontology.get(id)
    if (!ent) return false
    const tags = ent.tags.includes(tag) ? ent.tags : [...ent.tags, tag]
    ontology.upsert({ ...ent, tags })
    auditLog.record({ action: 'TAG', target: ent.label, detail: `Tag ${tag}` })
    return true
  }, [])

  const taskSensor = useCallback(({ lat, lng, targetLabel }) => {
    const asset = createSensorTasking({ lat, lng, targetLabel })
    auditLog.record({
      actor: auditLog.ACTOR.AIP,
      action: 'SENSOR TASKING',
      target: asset.label,
      detail: `Simulated cue → ${lat.toFixed(3)}, ${lng.toFixed(3)}${targetLabel ? ` (${targetLabel})` : ''}`,
      meta: { simulated: true }
    })
    addToast?.({ message: `Simulated sensor ${asset.label} tasked`, type: 'success' })
    return asset
  }, [addToast])

  const logAudit = useCallback((entry) => auditLog.record(entry), [])
  const auditEntries = useMemo(() => auditLog.all(), [version])

  const focusEntity = useCallback((id) => {
    setSelectedEntityId(id || null)
    setSuite((prev) => ({ ...prev, explorer: true }))
  }, [])

  const value = {
    entities,
    stats,
    version,
    query,
    getEntity,
    graph,
    classify,
    tagEntity,
    taskSensor,
    focusEntity,
    logAudit,
    auditEntries,
    suite,
    toggleSuite,
    selectedEntityId,
    setSelectedEntity,
    EntityType,
    Classification
  }

  return <OntologyContext.Provider value={value}>{children}</OntologyContext.Provider>
}

export const useOntology = () => {
  const ctx = useContext(OntologyContext)
  if (!ctx) throw new Error('useOntology must be used within an OntologyProvider')
  return ctx
}
