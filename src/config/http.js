/**
 * Layer: config (rank 1) — HTTP client configuration.
 *
 * The app supports two deployment shapes:
 *   - same-origin: dev Vite proxy, or frontend + backend co-hosted. Leave
 *     `VITE_API_BASE` unset.
 *   - split: the static frontend (e.g. Vercel) talks to a separately deployed
 *     backend. Set `VITE_API_BASE` (e.g. https://world-monitor-api.onrender.com)
 *     so REST + WebSocket resolve to that host.
 */
const trimBase = (value) => String(value || '').trim().replace(/\/+$/, '')

/** REST base URL ('' = same-origin). */
export const API_BASE = trimBase(import.meta.env.VITE_API_BASE)

/** True when a remote backend base is configured. */
export const HAS_REMOTE_BACKEND = API_BASE.length > 0

/**
 * Resolve the WebSocket URL. Prefers an explicit `VITE_WS_URL`, else derives
 * ws(s) from `VITE_API_BASE`, else falls back to the current origin.
 * @returns {string}
 */
export function resolveWsUrl() {
  const explicit = trimBase(import.meta.env.VITE_WS_URL)
  if (explicit) return `${explicit.replace(/^http/, 'ws')}/ws`
  if (API_BASE) return `${API_BASE.replace(/^http/, 'ws')}/ws`
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export const HTTP_CONFIG = Object.freeze({
  defaultTimeoutMs: 15000,
  jsonHeaders: Object.freeze({ 'Content-Type': 'application/json' })
})
