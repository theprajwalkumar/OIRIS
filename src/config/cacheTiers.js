/**
 * Layer: config (rank 1) — build-time / runtime configuration + constants.
 * May import from `types` only. MUST NOT import services/components/app.
 */

/**
 * Named cache tiers in seconds (HTTP `s-maxage` semantics), mirroring the
 * Osiris cache-tier model. The server owns the authoritative tier map
 * in `server/cache.js`; this is the client-side mirror for UI staleness hints.
 */
export const CACHE_TIERS = Object.freeze({
  fast: 300,
  medium: 600,
  slow: 1800,
  static: 7200,
  daily: 86400,
  noStore: 0
})

/** Default age after which a cached dataset is considered WARN (>1x), STALE (>3x). */
export const DEFAULT_MAX_STALE_MS = 30 * 60 * 1000

/**
 * Convert a named tier to milliseconds.
 * @param {import('../types/domain.js').CacheTier} tier
 * @returns {number}
 */
export const tierToMs = (tier) => {
  const seconds = CACHE_TIERS[tier] ?? CACHE_TIERS.medium
  return seconds * 1000
}
