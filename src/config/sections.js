/**
 * Layer: config (rank 1) — Project Next Level section registry.
 *
 * Single source of truth for the left-rail navigation and the scroll-spy
 * targets. `icon` is a lucide-react name resolved in the rail component so
 * this module stays dependency-free.
 */
export const SECTIONS = Object.freeze([
  { id: 'situation', label: 'Situation', icon: 'Radar' },
  { id: 'instability', label: 'Instability', icon: 'Activity' },
  { id: 'markets', label: 'Markets', icon: 'LineChart' },
  { id: 'cyber', label: 'Cyber', icon: 'ShieldAlert' },
  { id: 'domain', label: 'Air, sea and space', icon: 'Plane' },
  { id: 'earth', label: 'Earth', icon: 'Globe' }
])

/** Section ids that exist in the scroll flow (rail collapses infra→earth). */
export const SECTION_IDS = Object.freeze([
  'situation',
  'instability',
  'markets',
  'cyber',
  'domain',
  'infrastructure',
  'earth'
])

/** Map a scroll section id to the rail item that should be active. */
export const railIdFor = (sectionId) =>
  sectionId === 'infrastructure' ? 'earth' : sectionId

/** Time-range presets for the top-bar segmented control. */
export const RANGE_PRESETS = Object.freeze([
  { id: '1h', label: '1h', ms: 3600000 },
  { id: '6h', label: '6h', ms: 21600000 },
  { id: '24h', label: '24h', ms: 86400000 },
  { id: '7d', label: '7d', ms: 604800000 }
])
