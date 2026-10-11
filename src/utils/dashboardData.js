/**
 * Layer: utils (rank 1) — curated static + deterministic semi-random datasets
 * used to hydrate dashboard panels that have no keyless live feed yet.
 *
 * Everything here is either (a) fixed reference data (ports, cables, spaceports)
 * or (b) produced by a seeded PRNG so it stays stable across re-renders.
 * Panels that DO have live sources (events, flights, ISS, IODA, CISA KEV,
 * aviation weather) read from their real feeds instead.
 */

/** Deterministic 32-bit hash → [0,1) stream seeded by a string. */
export function seededRng(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rint = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

export const REGIONS = [
  { id: 'ukraine', label: 'Ukraine / Black Sea', base: 0.94, trend: 1 },
  { id: 'levant', label: 'Levant', base: 0.88, trend: 1 },
  { id: 'redsea', label: 'Red Sea', base: 0.82, trend: 0 },
  { id: 'iran', label: 'Iran', base: 0.71, trend: 1 },
  { id: 'taiwan', label: 'Taiwan Strait', base: 0.68, trend: 0 },
  { id: 'korea', label: 'Korean Peninsula', base: 0.57, trend: 0 },
  { id: 'scs', label: 'South China Sea', base: 0.54, trend: 1 },
  { id: 'sahel', label: 'Sahel', base: 0.49, trend: 0 },
  { id: 'haiti', label: 'Haiti / Caribbean', base: 0.41, trend: 0 },
  { id: 'kashmir', label: 'Kashmir LoC', base: 0.38, trend: 0 }
]

export function buildInstabilityIndex() {
  return REGIONS.map((r) => {
    const rng = seededRng(`cii-${r.id}`)
    const score = Math.min(1, r.base + (rng() - 0.5) * 0.06)
    const level = score >= 0.8 ? 'critical' : score >= 0.6 ? 'high' : score >= 0.4 ? 'elevated' : 'stable'
    return { ...r, score, level, delta: (rng() - 0.4) * 0.08 }
  }).sort((a, b) => b.score - a.score)
}

export const CONFLICT_ZONES = [
  { id: 'UKR-01', name: 'Donbas Front', region: 'Ukraine', severity: 'critical', status: 'Active Combat', since: '2022-02-24' },
  { id: 'GZA-02', name: 'Gaza Strip', region: 'Levant', severity: 'critical', status: 'Active Combat', since: '2023-10-07' },
  { id: 'RSD-03', name: 'Bab el-Mandeb', region: 'Red Sea', severity: 'critical', status: 'Maritime Interdiction', since: '2023-11-19' },
  { id: 'LEB-04', name: 'Southern Lebanon', region: 'Levant', severity: 'high', status: 'Exchange of Fire', since: '2023-10-08' },
  { id: 'SDN-05', name: 'Darfur', region: 'Sudan', severity: 'high', status: 'Civil War', since: '2023-04-15' },
  { id: 'MMR-06', name: 'Rakhine', region: 'Myanmar', severity: 'high', status: 'Insurgency', since: '2021-02-01' },
  { id: 'SAH-07', name: 'Mali / Sahel', region: 'Sahel', severity: 'medium', status: 'Insurgency', since: '2012-01-17' },
  { id: 'HTI-08', name: 'Port-au-Prince', region: 'Haiti', severity: 'medium', status: 'Gang Violence', since: '2021-07-07' }
]

export const CRITICAL_ALERTS = [
  { id: 'a1', level: 'high', title: 'Ballistic activity — Black Sea corridor', region: 'Ukraine', source: 'OSINT' },
  { id: 'a2', level: 'high', title: 'AIS blackout cluster — Gulf of Aden', region: 'Red Sea', source: 'Maritime' },
  { id: 'a3', level: 'medium', title: 'GPS interference reported — Baltic', region: 'Europe', source: 'ADS-B' },
  { id: 'a4', level: 'high', title: 'Critical CVE actively exploited — edge VPN', region: 'Global', source: 'CISA KEV' },
  { id: 'a5', level: 'medium', title: 'Undersea cable latency anomaly — Red Sea', region: 'MEA', source: 'IODA' },
  { id: 'a6', level: 'low', title: 'Seismic swarm — Reykjanes peninsula', region: 'Iceland', source: 'USGS' },
  { id: 'a7', level: 'medium', title: 'Large wildfire front — Central Chile', region: 'S. America', source: 'EONET' }
]

export const CYBER_ATTACK = {
  attackers: [
    { id: 'ru', label: 'RU', name: 'Russia', lat: 55.75, lng: 37.62 },
    { id: 'cn', label: 'CN', name: 'China', lat: 39.9, lng: 116.4 },
    { id: 'ir', label: 'IR', name: 'Iran', lat: 35.7, lng: 51.4 },
    { id: 'kp', label: 'KP', name: 'North Korea', lat: 39.03, lng: 125.75 },
    { id: 'br', label: 'BR', name: 'Brazil', lat: -15.79, lng: -47.88 },
    { id: 'vn', label: 'VN', name: 'Vietnam', lat: 21.03, lng: 105.85 }
  ],
  targets: [
    { id: 'us', label: 'US', name: 'United States', lat: 38.9, lng: -77.04 },
    { id: 'de', label: 'DE', name: 'Germany', lat: 52.52, lng: 13.4 },
    { id: 'gb', label: 'GB', name: 'United Kingdom', lat: 51.5, lng: -0.13 },
    { id: 'in', label: 'IN', name: 'India', lat: 28.61, lng: 77.2 },
    { id: 'jp', label: 'JP', name: 'Japan', lat: 35.68, lng: 139.69 },
    { id: 'ua', label: 'UA', name: 'Ukraine', lat: 50.45, lng: 30.52 }
  ]
}

export function buildAttackFlows() {
  const rng = seededRng('attack-flows')
  const flows = []
  for (const a of CYBER_ATTACK.attackers) {
    const n = rint(rng, 1, 3)
    for (let i = 0; i < n; i++) {
      const t = pick(rng, CYBER_ATTACK.targets)
      flows.push({
        id: `${a.id}-${t.id}-${i}`,
        from: a,
        to: t,
        intensity: rint(rng, 12, 98),
        vector: pick(rng, ['Scan', 'DDoS', 'Exploit', 'BruteForce', 'C2', 'Exfil']),
        port: pick(rng, [80, 443, 22, 3389, 445, 8080, 53])
      })
    }
  }
  return flows
}

export function buildBotnets() {
  const rng = seededRng('botnets')
  const families = ['Mirai', 'Cobalt Strike', 'Emotet', 'Qakbot', 'Gafgyt', 'TrickBot', 'Gh0st RAT', 'Sliver']
  const countries = ['US', 'RU', 'CN', 'DE', 'NL', 'BR', 'IN', 'RO', 'UA', 'SG']
  return families.map((f) => ({
    id: f,
    family: f,
    c2Count: rint(rng, 8, 240),
    bots: rint(rng, 1200, 94000),
    country: pick(rng, countries),
    trend: (rng() - 0.4) * 0.3
  })).sort((a, b) => b.bots - a.bots)
}

export const SUBMARINE_CABLES = [
  { id: 'aae1', name: 'AAE-1', status: 'operational', capacity: '40 Tbps', path: [[12.8, 45.0], [15.0, 40.0], [20.0, 38.5], [27.0, 34.0], [30.0, 32.5]] },
  { id: 'seamewe', name: 'SEA-ME-WE 5', status: 'operational', capacity: '24 Tbps', path: [[1.3, 103.8], [6.0, 95.0], [8.0, 77.0], [12.8, 45.0], [30.0, 32.5]] },
  { id: 'marea', name: 'MAREA', status: 'operational', capacity: '160 Tbps', path: [[37.0, -6.0], [40.0, -20.0], [38.0, -40.0], [39.0, -60.0], [37.0, -74.0]] },
  { id: 'faster', name: 'FASTER', status: 'degraded', capacity: '60 Tbps', path: [[34.7, 135.5], [35.0, 160.0], [40.0, -170.0], [45.0, -124.0]] },
  { id: 'eig', name: 'Europe India Gateway', status: 'operational', capacity: '3.84 Tbps', path: [[51.5, -0.1], [43.0, -9.0], [36.0, -6.0], [30.0, 32.5], [25.0, 55.0], [19.0, 72.8]] },
  { id: 'redsea-1', name: 'Red Sea Segment 1', status: 'degraded', capacity: '12 Tbps', path: [[27.0, 34.0], [20.0, 38.5], [15.0, 40.0], [12.8, 45.0]] }
]

export const MARITIME_PORTS = [
  { id: 'shanghai', name: 'Shanghai', country: 'CN', lat: 31.23, lng: 121.47, activity: 0.97 },
  { id: 'singapore', name: 'Singapore', country: 'SG', lat: 1.29, lng: 103.85, activity: 0.94 },
  { id: 'rotterdam', name: 'Rotterdam', country: 'NL', lat: 51.95, lng: 4.14, activity: 0.82 },
  { id: 'jebelali', name: 'Jebel Ali', country: 'AE', lat: 25.01, lng: 55.06, activity: 0.79 },
  { id: 'losangeles', name: 'Los Angeles', country: 'US', lat: 33.74, lng: -118.27, activity: 0.76 },
  { id: 'antwerp', name: 'Antwerp', country: 'BE', lat: 51.26, lng: 4.4, activity: 0.71 },
  { id: 'busan', name: 'Busan', country: 'KR', lat: 35.1, lng: 129.04, activity: 0.74 },
  { id: 'piraeus', name: 'Piraeus', country: 'GR', lat: 37.94, lng: 23.63, activity: 0.6 }
]

export function buildDarkShips() {
  const rng = seededRng('dark-ships')
  const zones = [
    ['Gulf of Aden', 12.6, 43.4], ['South China Sea', 12.0, 114.0],
    ['Gulf of Guinea', 4.0, 3.0], ['Strait of Hormuz', 26.6, 56.2],
    ['Western Caribbean', 15.0, -78.0]
  ]
  return zones.map((z, i) => ({
    id: `dark-${i}`,
    zone: z[0],
    lat: z[1] + (rng() - 0.5) * 3,
    lng: z[2] + (rng() - 0.5) * 3,
    mmsi: rint(rng, 200000000, 799999999),
    hours: rint(rng, 4, 96)
  }))
}

export const PLOTTED_PORTS = MARITIME_PORTS

export function buildPowerGrid() {
  const rng = seededRng('power-grid')
  return ['North America', 'Europe', 'Middle East', 'South Asia', 'East Asia', 'South America'].map((r) => ({
    id: r,
    region: r,
    loadPct: rint(rng, 55, 96),
    incidents: rint(rng, 0, 14),
    status: rng() > 0.8 ? 'caution' : 'nominal'
  }))
}

export const SPACEPORTS = [
  { id: 'ksc', name: 'Kennedy Space Center', country: 'US', lat: 28.57, lng: -80.65 },
  { id: 'baikonur', name: 'Baikonur Cosmodrome', country: 'KZ', lat: 45.96, lng: 63.31 },
  { id: 'jiuquan', name: 'Jiuquan', country: 'CN', lat: 40.96, lng: 100.29 },
  { id: 'kourou', name: 'Guiana Space Centre', country: 'GF', lat: 5.23, lng: -52.77 },
  { id: 'sriharikota', name: 'Satish Dhawan SHAR', country: 'IN', lat: 13.72, lng: 80.23 },
  { id: 'tanegashima', name: 'Tanegashima', country: 'JP', lat: 30.4, lng: 130.97 },
  { id: 'plesetsk', name: 'Plesetsk', country: 'RU', lat: 62.93, lng: 40.58 },
  { id: 'starbase', name: 'Starbase (Boca Chica)', country: 'US', lat: 25.99, lng: -97.15 }
]

export const GAMMA_IRRADIATORS = [
  { id: 'gi-1', name: 'Sterigenics Ontario', country: 'US', lat: 34.06, lng: -117.65 },
  { id: 'gi-2', name: 'BGS Beta-Gamma-Service', country: 'DE', lat: 50.93, lng: 7.1 },
  { id: 'gi-3', name: 'Isotron Swindon', country: 'GB', lat: 51.56, lng: -1.78 },
  { id: 'gi-4', name: 'Nordion Ottawa', country: 'CA', lat: 45.35, lng: -75.9 },
  { id: 'gi-5', name: 'Shin-Etsu Gunma', country: 'JP', lat: 36.39, lng: 139.06 }
]

export function buildRadiationWatch() {
  const rng = seededRng('radiation-watch')
  return ['LN-11', 'RU-42', 'CN-07', 'US-31', 'FR-02', 'JP-19', 'IN-05', 'DE-14'].map((id) => {
    const lat = (rng() - 0.5) * 130
    const lng = (rng() - 0.5) * 340
    return {
      id,
      name: `Station ${id}`,
      lat,
      lng,
      dose: +(0.08 + rng() * 0.9).toFixed(2),
      baseline: 0.11,
      status: rng() > 0.85 ? 'elevated' : 'nominal'
    }
  })
}

export function buildSatellitePasses() {
  const rng = seededRng('sat-passes')
  const sats = ['ISS (ZARYA)', 'USA-224 (KH-11)', 'YAOGAN-41', 'COSMO-SKYMED 2', 'STARLINK-31122', 'SENTINEL-1A', 'GOKTURK-2']
  return sats.map((name, i) => ({
    id: `sat-pass-${i}`,
    name,
    norad: rint(rng, 20000, 60000),
    elevation: rint(rng, 10, 88),
    azimuth: rint(rng, 0, 359),
    nextPass: `${rint(rng, 1, 89)}m ${rint(rng, 0, 59)}s`,
    duration: `${rint(rng, 3, 12)}m`,
    status: rng() > 0.75 ? 'tracking' : 'standby'
  }))
}

export const CHOKEPOINTS = [
  { id: 'suez', name: 'Suez Canal', status: 'nominal', transit: 48 },
  { id: 'hormuz', name: 'Strait of Hormuz', status: 'caution', transit: 31 },
  { id: 'bab', name: 'Bab el-Mandeb', status: 'critical', transit: 12 },
  { id: 'malacca', name: 'Strait of Malacca', status: 'nominal', transit: 62 },
  { id: 'panama', name: 'Panama Canal', status: 'caution', transit: 22 },
  { id: 'bosphorus', name: 'Bosphorus', status: 'nominal', transit: 27 }
]

export function buildAisVessels() {
  const rng = seededRng('ais-vessels')
  const types = ['Cargo', 'Tanker', 'LNG Carrier', 'Bulk Carrier', 'Container', 'Fishing']
  const flags = ['PA', 'LR', 'MH', 'SG', 'MT', 'BS', 'GR', 'CN']
  const out = []
  for (let i = 0; i < 60; i++) {
    out.push({
      id: `mmsi${i}`,
      mmsi: rint(rng, 200000000, 799999999),
      name: `MV ${pick(rng, ['Aegean', 'Nordic', 'Pacific', 'Ocean', 'Global', 'Caspian'])} ${pick(rng, ['Star', 'Spirit', 'Trader', 'Voyager', 'Pioneer'])}`,
      type: pick(rng, types),
      flag: pick(rng, flags),
      lat: (rng() - 0.5) * 140,
      lng: (rng() - 0.5) * 350,
      speed: +(4 + rng() * 20).toFixed(1),
      status: rng() > 0.92 ? 'dark' : 'transmitting'
    })
  }
  return out
}

export function buildFeedCoverage() {
  const rng = seededRng('feed-coverage')
  return {
    publishers: rint(rng, 42, 88),
    items: rint(rng, 1200, 4800),
    completed: rint(rng, 210, 640),
    categories: rint(rng, 18, 25),
    statusHealthy: rint(rng, 8, 11),
    statusTotal: 12,
    tickerSpeed: rint(rng, 28, 64)
  }
}

export function buildNewsHeadlines() {
  const items = [
    { sev: 'critical', src: 'Reuters', cc: 'UA', text: 'Air-raid alerts across multiple oblasts; energy infrastructure targeted overnight.' },
    { sev: 'high', src: 'AP', cc: 'IL', text: 'Cross-border exchange intensifies along northern frontier.' },
    { sev: 'high', src: 'Bloomberg', cc: 'CN', text: 'Export controls tighten on advanced semiconductor tooling.' },
    { sev: 'medium', src: 'DW', cc: 'DE', text: 'Rail union announces 48-hour strike affecting freight corridors.' },
    { sev: 'critical', src: 'Al Jazeera', cc: 'YE', text: 'Coalition reports new maritime interdiction in Bab el-Mandeb.' },
    { sev: 'medium', src: 'France24', cc: 'FR', text: 'Wildfire containment improves; red-flag warnings persist inland.' },
    { sev: 'high', src: 'Sky News', cc: 'GB', text: 'Nation-state APT attributed to campaign against telcos.' },
    { sev: 'info', src: 'Euronews', cc: 'EU', text: 'Grid operator restores interconnector after planned maintenance.' }
  ]
  return items
}
