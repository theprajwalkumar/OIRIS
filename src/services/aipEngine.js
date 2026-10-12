/**
 * Layer: services (rank 2) — AIP for Defense analyst engine.
 *
 * HONEST NOTE: this is a deterministic, offline NLP/intent engine that reasons
 * over the live ontology store. It is NOT a cloud LLM and requires no API key;
 * it parses natural-language prompts into structured intents and answers using
 * real map/feed state. It never fabricates data — when it cannot answer it says
 * so. Every insight it produces should be logged to the audit trail.
 *
 * Returns a structured result the UI renders; mutations are returned as
 * declarative `action` descriptors and executed by the caller (so audit
 * logging stays centralised).
 */
import { EntityType } from './ontologyService.js'

export const SUGGESTIONS = [
  'threat summary',
  'how many military aircraft',
  'show critical incidents',
  'find callsign RCH',
  'count cyber threats',
  'top threat groups',
  'list sensors',
  'classify <entity> as hostile',
  'task sensor at 28.61, 77.20'
]

const SEV_WORDS = ['critical', 'high', 'medium', 'info']

function matchType(text) {
  if (/\b(aircraft|plane|flight|platform|major end item|mei|drone|uav)\b/.test(text)) return EntityType.MAJOR_END_ITEM
  if (/\b(sensor|satellite|radar|asset|collection)\b/.test(text)) return EntityType.INTEL_ASSET
  if (/\b(threat|cyber|malware|ransomware|vuln|ioc|indicator)\b/.test(text)) return EntityType.THREAT_ENTITY
  if (/\b(incident|earthquake|quake|disaster|outage|fire|storm|conflict)\b/.test(text)) return EntityType.INCIDENT
  if (/\b(facility|base|spaceport|airport|cable)\b/.test(text)) return EntityType.FACILITY
  if (/\b(organization|group|org|actor)\b/.test(text)) return EntityType.ORGANIZATION
  if (/\b(location|country|region)\b/.test(text)) return EntityType.LOCATION
  if (/\b(identity|callsign|ip|domain|hash)\b/.test(text)) return EntityType.IDENTITY
  return null
}

const countByType = (entities, type) => entities.filter((e) => e.type === type)

/**
 * Interpret a prompt against the current ontology state.
 * @param {string} prompt
 * @param {{entities:Array, stats:Object}} ctx
 * @returns {{kind:string, answer:string, entities:Array, action:Object|null}}
 */
export function interpret(prompt, ctx) {
  const raw = String(prompt || '').trim()
  const text = raw.toLowerCase()
  const entities = ctx?.entities || []
  const stats = ctx?.stats || { total: 0, byType: {}, byClassification: {}, edges: 0 }

  if (!text) return { kind: 'empty', answer: 'Standing by. Enter a query.', entities: [], action: null }

  // help
  if (/^(help|\?|commands|what can you do)/.test(text)) {
    return {
      kind: 'help',
      answer: 'I can summarise threats, count entities by type, surface critical items, find a callsign/IOC, reclassify a track, or task a simulated sensor. Try: "threat summary", "how many military aircraft", "find callsign RCH", "task sensor at 28.61, 77.20".',
      entities: [],
      action: null
    }
  }

  // task sensor
  const taskMatch = text.match(/task\s+sensor(?:\s+(?:at|near|on))?\s*([0-9.-]+)?[,\s]+([0-9.-]+)?/)
  if (taskMatch && taskMatch[1] && taskMatch[2]) {
    const lat = parseFloat(taskMatch[1])
    const lng = parseFloat(taskMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        kind: 'tasking',
        answer: `Tasking simulated sensor to ${lat.toFixed(3)}, ${lng.toFixed(3)}. (Simulated cueing — no live collection.)`,
        entities: [],
        action: { type: 'taskSensor', payload: { lat, lng, targetLabel: 'operator cue' } }
      }
    }
  }

  // classify entity
  const clsMatch = text.match(/classify\s+(.+?)\s+as\s+(friendly|hostile|neutral|unknown)/)
  if (clsMatch) {
    const term = clsMatch[1].trim()
    const cls = clsMatch[2]
    const target = entities.find((e) => `${e.label} ${e.subtitle}`.toLowerCase().includes(term))
    if (!target) {
      return { kind: 'classify', answer: `No entity matching "${term}" in the current picture.`, entities: [], action: null }
    }
    return {
      kind: 'classify',
      answer: `Reclassified ${target.label} → ${cls.toUpperCase()}.`,
      entities: [target],
      action: { type: 'classify', payload: { id: target.id, classification: cls, label: target.label } }
    }
  }

  // threat summary
  if (/summary|situation|sitrep|overview|brief/.test(text)) {
    const critical = countByType(entities, null).filter((e) => e.severity === 'critical').length
    const hostile = stats.byClassification?.hostile || 0
    const military = countByType(entities, EntityType.MAJOR_END_ITEM).filter((e) => e.tags.includes('military')).length
    const lines = [
      `Total objects: ${stats.total} across ${stats.edges} relationships.`,
      `Critical: ${critical} · Hostile-classified: ${hostile}.`,
      `Military air tracks: ${military}.`,
      `Cyber threats: ${stats.byType?.[EntityType.THREAT_ENTITY] || 0}. Incidents: ${stats.byType?.[EntityType.INCIDENT] || 0}.`
    ]
    const top = entities
      .filter((e) => e.severity === 'critical' || e.severity === 'high')
      .slice(0, 3)
      .map((e) => `• ${e.label} (${e.severity})`)
    if (top.length) lines.push('Priority items:', ...top)
    return { kind: 'summary', answer: lines.join('\n'), entities: entities.slice(0, 5), action: null }
  }

  // top threat groups
  if (/top.*(group|actor)|threat groups|ransomware groups/.test(text)) {
    const groups = {}
    for (const e of entities) {
      const g = e.props?.group
      if (e.type === EntityType.THREAT_ENTITY && g && g !== '—') groups[g] = (groups[g] || 0) + 1
    }
    const ranked = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (!ranked.length) return { kind: 'groups', answer: 'No attributed threat groups in the current feed window.', entities: [], action: null }
    return {
      kind: 'groups',
      answer: `Top attributed groups:\n${ranked.map(([g, n]) => `• ${g} — ${n} indicator(s)`).join('\n')}`,
      entities: [],
      action: null
    }
  }

  // list sensors
  if (/sensor|collection asset/.test(text) && !/task/.test(text)) {
    const sensors = countByType(entities, EntityType.INTEL_ASSET)
    if (!sensors.length) return { kind: 'sensors', answer: 'No collection assets online. Task one with "task sensor at lat, lng".', entities: [], action: null }
    return {
      kind: 'sensors',
      answer: `${sensors.length} collection asset(s):\n${sensors.slice(0, 8).map((s) => `• ${s.label} · ${s.props?.status || 'standby'}`).join('\n')}`,
      entities: sensors,
      action: null
    }
  }

  // find <term>
  const findMatch = text.match(/find\s+(.+)/)
  if (findMatch) {
    const term = findMatch[1].replace(/^(callsign|ip|domain|hash)\s+/, '').trim()
    const found = entities.filter((e) => `${e.label} ${e.subtitle} ${JSON.stringify(e.props)}`.toLowerCase().includes(term))
    if (!found.length) return { kind: 'find', answer: `No object matching "${term}".`, entities: [], action: null }
    return {
      kind: 'find',
      answer: `${found.length} match(es):\n${found.slice(0, 8).map((f) => `• ${f.label} — ${f.type}${f.countryCode ? ` · ${f.countryCode}` : ''}`).join('\n')}`,
      entities: found.slice(0, 20),
      action: null
    }
  }

  // count / how many
  if (/\b(how many|count|number of)\b/.test(text) || /^count/.test(text)) {
    const type = matchType(text)
    const milOnly = /military|mil\b/.test(text)
    let set = type ? countByType(entities, type) : entities
    if (milOnly) set = set.filter((e) => e.tags.includes('military'))
    const label = type ? type : 'object'
    return {
      kind: 'count',
      answer: `${set.length} ${milOnly ? 'military ' : ''}${label.toLowerCase()} object(s) in the current picture.`,
      entities: set.slice(0, 20),
      action: null
    }
  }

  // show/list <severity|type>
  if (/\b(show|list|display|surface)\b/.test(text)) {
    const sev = SEV_WORDS.find((s) => text.includes(s))
    const type = matchType(text)
    const set = entities.filter((e) => (!sev || e.severity === sev) && (!type || e.type === type))
    if (!set.length) return { kind: 'list', answer: 'No objects match that filter.', entities: [], action: null }
    return {
      kind: 'list',
      answer: `${set.length} object(s)${sev ? ` at ${sev.toUpperCase()}` : ''}${type ? ` of type ${type}` : ''}.`,
      entities: set.slice(0, 30),
      action: null
    }
  }

  // generic: search whole ontology
  const generic = entities.filter((e) => `${e.label} ${e.subtitle} ${e.type}`.toLowerCase().includes(text))
  if (generic.length) {
    return { kind: 'search', answer: `${generic.length} object(s) reference "${raw}".`, entities: generic.slice(0, 20), action: null }
  }

  return {
    kind: 'unknown',
    answer: `I couldn't map "${raw}" to a known object or intent. Try "help" for supported queries.`,
    entities: [],
    action: null
  }
}

export default interpret
