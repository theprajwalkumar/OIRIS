/**
 * Server-side caching + freshness tracking (seed-meta equivalent).
 *
 * This module is the single source of truth for:
 *   - named cache tiers (HTTP `s-maxage` semantics, in seconds)
 *   - in-memory TTLs for hot paths (in ms)
 *   - a small in-memory cache with in-flight request coalescing (stampede
 *     protection) so concurrent callers share one upstream fetch
 *   - per-dataset freshness metadata ("seed-meta"), mirroring the
 *     WorldMonitor freshness model: OK / WARN / STALE / EMPTY.
 *
 * It has no dependencies and no knowledge of providers or routes; callers
 * supply the fetcher. Safe to import from any server module.
 */

/** Named cache tiers in seconds (HTTP s-maxage semantics). */
export const CACHE_TIERS = Object.freeze({
  fast: 300,
  medium: 600,
  slow: 1800,
  static: 7200,
  daily: 86400,
  noStore: 0
})

/** In-memory TTLs (ms) for the hot request/ingestion paths. */
export const TTL = Object.freeze({
  flights: 12000,
  global: 60000,
  route: 3600000,
  aircraft: 3600000,
  ingestion: 300000,
  medium: 600000
})

/** Default age (ms) thresholds for freshness classification. */
export const DEFAULT_MAX_STALE_MS = 30 * 60 * 1000

const SEED_META_PREFIX = 'seed-meta:'

/**
 * Create an isolated in-memory cache instance.
 * @returns {{
 *   get(key: string): any|null,
 *   set(key: string, data: any, ttlMs?: number): any,
 *   has(key: string): boolean,
 *   delete(key: string): boolean,
 *   clear(): void,
 *   size(): number,
 *   keys(): string[],
 *   getOrSet(key: string, fetcher: () => Promise<any>, ttlMs?: number): Promise<{ data: any, cached: boolean }>
 * }}
 */
export function createCache() {
  const store = new Map()
  const inflight = new Map()

  return {
    get(key) {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key)
        return null
      }
      return entry.data
    },

    set(key, data, ttlMs = TTL.medium) {
      const now = Date.now()
      store.set(key, {
        data,
        timestamp: now,
        ttlMs,
        // ttl <= 0 means "no store" (immediately stale), not "never expires".
        expiresAt: ttlMs > 0 ? now + ttlMs : now - 1
      })
      return data
    },

    has(key) {
      return this.get(key) !== null
    },

    delete(key) {
      return store.delete(key)
    },

    clear() {
      store.clear()
      inflight.clear()
    },

    size() {
      return store.size
    },

    keys() {
      return Array.from(store.keys())
    },

    /**
     * Return a cached value, or run `fetcher` (coalescing concurrent calls
     * for the same key) and cache its result.
     * @returns {Promise<{ data: any, cached: boolean }>}
     */
    async getOrSet(key, fetcher, ttlMs = TTL.medium) {
      const hit = this.get(key)
      if (hit !== null) return { data: hit, cached: true }

      let pending = inflight.get(key)
      if (!pending) {
        pending = Promise.resolve()
          .then(fetcher)
          .then((data) => {
            this.set(key, data, ttlMs)
            return data
          })
          .finally(() => inflight.delete(key))
        inflight.set(key, pending)
      }

      const data = await pending
      return { data, cached: false }
    }
  }
}

/**
 * Convenience wrapper around `cache.getOrSet`.
 * @param {ReturnType<typeof createCache>} cache
 * @param {string} key
 * @param {() => Promise<any>} fetcher
 * @param {{ ttlMs?: number }} [options]
 * @returns {Promise<{ data: any, cached: boolean }>}
 */
export function cachedFetchJson(cache, key, fetcher, options = {}) {
  const { ttlMs = TTL.medium } = options
  return cache.getOrSet(key, fetcher, ttlMs)
}

/** Process-wide seed-meta store. */
const seedMeta = new Map()

/**
 * Classify a seed-meta entry's freshness.
 * @param {{ key: string, fetchedAt: number, recordCount: number|null, maxStaleMs: number }} entry
 * @returns {{ key: string, fetchedAt: number, recordCount: number|null, ageMs: number, status: 'OK'|'WARN'|'STALE'|'EMPTY' }}
 */
export function classifySeedMeta(entry) {
  const age = Date.now() - entry.fetchedAt
  const maxStale = entry.maxStaleMs || DEFAULT_MAX_STALE_MS
  let status = 'OK'
  if (entry.recordCount === 0) status = 'EMPTY'
  else if (age > maxStale * 3) status = 'STALE'
  else if (age > maxStale) status = 'WARN'
  return {
    key: entry.key,
    fetchedAt: entry.fetchedAt,
    recordCount: entry.recordCount ?? null,
    ageMs: age,
    status
  }
}

/**
 * Record freshness metadata for a dataset after a successful fetch/seed.
 * @param {string} key
 * @param {{ recordCount?: number|null, fetchedAt?: number, ttlMs?: number|null, maxStaleMs?: number }} [info]
 */
export function writeSeedMeta(key, info = {}) {
  const entry = {
    key: `${SEED_META_PREFIX}${key}`,
    fetchedAt: info.fetchedAt ?? Date.now(),
    recordCount: info.recordCount ?? null,
    ttlMs: info.ttlMs ?? null,
    maxStaleMs: info.maxStaleMs ?? DEFAULT_MAX_STALE_MS
  }
  seedMeta.set(key, entry)
  return entry
}

/**
 * @param {string} key
 * @returns {object|null}
 */
export function readSeedMeta(key) {
  return seedMeta.get(key) || null
}

/**
 * @returns {Array<{ key: string, fetchedAt: number, recordCount: number|null, ageMs: number, status: 'OK'|'WARN'|'STALE'|'EMPTY' }>}
 */
export function listSeedMeta() {
  return Array.from(seedMeta.values()).map(classifySeedMeta)
}

/**
 * Freshness for a single dataset key, or EMPTY if never seeded.
 * @param {string} key
 * @param {number} [maxStaleMs]
 */
export function classifyKey(key, maxStaleMs = DEFAULT_MAX_STALE_MS) {
  const entry = seedMeta.get(key)
  if (!entry) return { key, fetchedAt: null, recordCount: null, ageMs: null, status: 'EMPTY' }
  return classifySeedMeta({ ...entry, maxStaleMs })
}
