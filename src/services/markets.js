/**
 * Layer: services (rank 2) — realtime market data access.
 *
 * Thin wrapper over the Express `/api/markets` endpoint. The backend owns
 * upstream fetching, per-symbol coalescing and short-lived caching.
 */
import { requestJson } from './http.js'

/**
 * Realtime-ish market snapshot (India-first).
 * @returns {Promise<{
 *   groups: Array<{ id: string, label: string, items: Array<{
 *     symbol: string, name: string, price: number|null, change: number|null,
 *     changePct: number|null, currency: string|null, exchange: string|null,
 *     marketState: string|null, spark: number[]
 *   }> }>,
 *   source: string, cached: boolean, timestamp: number
 * }>}
 */
export function getMarkets() {
  return requestJson('/api/markets')
}
