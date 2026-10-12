/**
 * Layer: services (rank 2) — immutable Audit Trail.
 *
 * Append-only log of every operator action, filter change, entity mutation and
 * automated analyst insight, for human-in-the-loop accountability. Entries are
 * frozen on insert; there is intentionally no update/delete API.
 */

const MAX_ENTRIES = 1000

const state = {
  entries: [],
  listeners: new Set()
}

const ACTOR = Object.freeze({
  OPERATOR: 'OPERATOR',
  AIP: 'AIP',
  SYSTEM: 'SYSTEM'
})

let counter = 0

function notify() {
  for (const fn of state.listeners) {
    try {
      fn()
    } catch {
      /* isolate listener errors */
    }
  }
}

/**
 * Record an immutable audit entry.
 * @param {{actor?:string, action:string, detail?:string, target?:string, meta?:Object}} entry
 */
export function record(entry) {
  const e = Object.freeze({
    id: `audit_${Date.now().toString(36)}_${(++counter).toString(36)}`,
    ts: Date.now(),
    actor: entry.actor || ACTOR.OPERATOR,
    action: entry.action || 'unknown',
    detail: entry.detail || '',
    target: entry.target || null,
    meta: entry.meta ? Object.freeze({ ...entry.meta }) : null
  })
  state.entries = [e, ...state.entries].slice(0, MAX_ENTRIES)
  notify()
  return e
}

export const auditLog = {
  ACTOR,
  record,
  /** Newest-first snapshot. */
  all() {
    return state.entries
  },
  size() {
    return state.entries.length
  },
  subscribe(fn) {
    state.listeners.add(fn)
    return () => state.listeners.delete(fn)
  },
  clear() {
    state.entries = []
    notify()
  }
}

export default auditLog
