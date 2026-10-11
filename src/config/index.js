/**
 * Layer: config (rank 1) — public config surface.
 */
export { CACHE_TIERS, DEFAULT_MAX_STALE_MS, tierToMs } from './cacheTiers.js'
export { HTTP_CONFIG } from './http.js'
export {
  VARIANTS,
  DEFAULT_VARIANT,
  resolveVariant,
  getVariantConfig,
  applyVariant
} from './variant.js'
