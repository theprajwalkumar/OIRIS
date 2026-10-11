/**
 * Layer: services (rank 2) — system/health data access.
 */
import { requestJson } from './http.js'

/**
 * Backend health, including seed-meta freshness for cached feeds.
 * @returns {Promise<import('../types/domain.js').HealthStatus & { freshness?: import('../types/domain.js').SeedMeta[] }>}
 */
export function getHealth() {
  return requestJson('/health')
}

/**
 * Ingestion/stream statistics, if exposed by the backend.
 * @returns {Promise<{ [key: string]: unknown }>}
 */
export function getStats() {
  return requestJson('/api/stats')
}
