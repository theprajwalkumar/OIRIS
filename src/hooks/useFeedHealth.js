/**
 * Layer: hooks (rank 4) — polls backend `/health` for seed-meta freshness and
 * exposes per-feed status so UI can show which live sources are healthy.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { getHealth } from '../services/system.js'

const POLL_MS = 30000

const FEED_STATE = {
  OK: { label: 'LIVE', color: '#00ff88' },
  WARN: { label: 'DEGRADED', color: '#ffb800' },
  STALE: { label: 'STALE', color: '#ffb800' },
  EMPTY: { label: 'EMPTY', color: '#ffb800' },
  OFFLINE: { label: 'NO DATA', color: '#64748b' },
  ERROR: { label: 'ERROR', color: '#ff3355' }
}

/**
 * @returns {{
 *   feeds: Record<string, { state: string, label: string, color: string, ageMs: number|null, recordCount: number|null, fetchedAt: number|null }>,
 *   summary: { total: number, ok: number },
 *   lastChecked: number|null,
 *   error: boolean,
 *   refresh: () => void
 * }}
 */
export function useFeedHealth() {
  const [feeds, setFeeds] = useState({})
  const [lastChecked, setLastChecked] = useState(null)
  const [error, setError] = useState(false)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const data = await getHealth()
      if (!mounted.current) return
      const next = {}
      for (const entry of data?.freshness || []) {
        const feed = String(entry.key || '').replace(/^seed-meta:/, '')
        if (!feed) continue
        const meta = FEED_STATE[entry.status] || FEED_STATE.OFFLINE
        next[feed] = {
          state: entry.status || 'OFFLINE',
          label: meta.label,
          color: meta.color,
          ageMs: Number.isFinite(entry.ageMs) ? entry.ageMs : null,
          recordCount: Number.isFinite(entry.recordCount) ? entry.recordCount : null,
          fetchedAt: entry.fetchedAt || null
        }
      }
      setFeeds(next)
      setLastChecked(Date.now())
      setError(false)
    } catch {
      if (!mounted.current) return
      setError(true)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      mounted.current = false
      clearInterval(id)
    }
  }, [load])

  const values = Object.values(feeds)
  const summary = {
    total: values.length,
    ok: values.filter(f => f.state === 'OK').length
  }

  return { feeds, summary, lastChecked, error, refresh: load }
}

export { FEED_STATE }
