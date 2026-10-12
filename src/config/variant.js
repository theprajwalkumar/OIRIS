/**
 * Layer: config (rank 1) — variant (edition) resolution.
 *
 * Resolves the active dashboard variant from (in priority order):
 *   1. `?variant=` URL param
 *   2. `VITE_VARIANT` build-time env
 *   3. persisted localStorage value
 *   4. the default variant
 *
 * Resolution mirrors the Osiris variant conventions. `applyVariant`
 * is additive only: it sets `data-variant` on <html> and a default document
 * title; it does not alter existing app behavior.
 */
export const VARIANTS = Object.freeze([
  'full',
  'tech',
  'finance',
  'commodity',
  'happy',
  'energy'
])

export const DEFAULT_VARIANT = 'full'

const STORAGE_KEY = 'wm:variant'

const VARIANT_CONFIGS = Object.freeze({
  full: { label: 'Global Intelligence', refreshMs: 120000 },
  tech: { label: 'Tech Intelligence', refreshMs: 120000 },
  finance: { label: 'Finance Radar', refreshMs: 60000 },
  commodity: { label: 'Commodity Watch', refreshMs: 300000 },
  happy: { label: 'Positive Signals', refreshMs: 300000 },
  energy: { label: 'Energy Monitor', refreshMs: 300000 }
})

/**
 * @returns {string} a valid variant id
 */
export function resolveVariant() {
  let fromStorage = null
  try {
    fromStorage = localStorage.getItem(STORAGE_KEY)
  } catch {
    fromStorage = null
  }

  const fromUrl =
    typeof location !== 'undefined'
      ? new URLSearchParams(location.search).get('variant')
      : null
  const fromEnv = import.meta.env?.VITE_VARIANT ?? null

  const candidate = fromUrl || fromEnv || fromStorage || DEFAULT_VARIANT
  return VARIANTS.includes(candidate) ? candidate : DEFAULT_VARIANT
}

/**
 * @param {string} [variant]
 * @returns {{ label: string, refreshMs: number }}
 */
export function getVariantConfig(variant = resolveVariant()) {
  return VARIANT_CONFIGS[variant] ?? VARIANT_CONFIGS[DEFAULT_VARIANT]
}

/**
 * Apply the resolved variant to the document (additive, idempotent).
 * @param {string} [variant]
 * @returns {{ variant: string, label: string, refreshMs: number }}
 */
export function applyVariant(variant = resolveVariant()) {
  const config = getVariantConfig(variant)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.variant = variant
    if (!document.title) document.title = config.label
  }
  return { variant, ...config }
}
