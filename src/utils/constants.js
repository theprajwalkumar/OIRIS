export const EXPORT_FORMATS = [
  { id: 'json', label: 'JSON', icon: 'FileJson', description: 'Structured event data with full metadata' },
  { id: 'csv', label: 'CSV', icon: 'FileText', description: 'Tabular format for spreadsheet analysis' }
]

export const SEVERITY_LEVELS = [
  { id: 'critical', label: 'CRITICAL', color: '#ff3355', priority: 0 },
  { id: 'high', label: 'HIGH', color: '#ffb800', priority: 1 },
  { id: 'medium', label: 'MEDIUM', color: '#00d4ff', priority: 2 },
  { id: 'info', label: 'INFO', color: '#00ff88', priority: 3 }
]

// Targeting-HUD / ontology classification palette.
export const CLASSIFICATION_META = {
  hostile: { label: 'HOSTILE', color: '#ff3355' },
  unknown: { label: 'UNKNOWN', color: '#ffb800' },
  neutral: { label: 'NEUTRAL', color: '#00d4ff' },
  friendly: { label: 'FRIENDLY', color: '#00ff88' }
}

export const classificationColor = (c) => (CLASSIFICATION_META[c] || CLASSIFICATION_META.unknown).color

export const EVENT_CATEGORIES = [
  { id: 'conflict', label: 'Armed Conflict', group: 'geopolitics', icon: 'Crosshair' },
  { id: 'cisa-kev', label: 'CISA KEV Exploit', group: 'geopolitics', icon: 'AlertTriangle' },
  { id: 'unrest', label: 'Civil Unrest', group: 'geopolitics', icon: 'Users' },
  { id: 'satellite', label: 'Satellite Orbit', group: 'geopolitics', icon: 'Satellite' },
  { id: 'ais', label: 'AIS Vessel', group: 'maritime', icon: 'Ship' },
  { id: 'chokepoint', label: 'Chokepoint Transit', group: 'maritime', icon: 'Anchor' },
  { id: 'dark-fleet', label: 'Dark Fleet', group: 'maritime', icon: 'EyeOff' },
  { id: 'flight', label: 'Flight Track', group: 'aviation', icon: 'Plane' },
  { id: 'military-flight', label: 'Military Aircraft', group: 'aviation', icon: 'Plane' },
  { id: 'aviation-weather', label: 'Aviation Weather', group: 'aviation', icon: 'CloudFog' },
  { id: 'internet-outage', label: 'Internet Outage', group: 'infrastructure', icon: 'WifiOff' },
  { id: 'power-grid', label: 'Power Grid Event', group: 'infrastructure', icon: 'Zap' },
  { id: 'earthquake', label: 'Earthquake', group: 'physical', icon: 'WavePulse' },
  { id: 'wildfire', label: 'Wildfire', group: 'physical', icon: 'Flame' },
  { id: 'weather', label: 'Extreme Weather', group: 'physical', icon: 'CloudLightning' },
  { id: 'volcano', label: 'Volcanic Activity', group: 'physical', icon: 'Mountain' },
  { id: 'disaster', label: 'Disaster Alert', group: 'physical', icon: 'Siren' },
  { id: 'flood', label: 'Flood', group: 'physical', icon: 'Waves' },
  { id: 'drought', label: 'Drought', group: 'physical', icon: 'Sun' },
  { id: 'dust', label: 'Dust / Haze', group: 'physical', icon: 'Wind' },
  { id: 'ice', label: 'Sea / Lake Ice', group: 'physical', icon: 'Snowflake' },
  { id: 'landslide', label: 'Landslide', group: 'physical', icon: 'MountainSnow' },
  { id: 'c2', label: 'C2 Server', group: 'cyber', icon: 'Server' },
  { id: 'phishing', label: 'Phishing Host', group: 'cyber', icon: 'Link' },
  { id: 'malware', label: 'Malware Family', group: 'cyber', icon: 'Bug' }
]

export const MARITIME_CHOKEPOINTS = [
  { id: 'hormuz', name: 'Strait of Hormuz', lat: 26.57, lng: 56.25, width: 39, critical: true },
  { id: 'malacca', name: 'Strait of Malacca', lat: 2.2, lng: 102.3, width: 1.7, critical: true },
  { id: 'suez', name: 'Suez Canal', lat: 30.5, lng: 32.3, width: 0.3, critical: true },
  { id: 'bab-el-mandeb', name: 'Bab el-Mandeb', lat: 12.6, lng: 43.4, width: 18, critical: true },
  { id: 'gibraltar', name: 'Strait of Gibraltar', lat: 35.9, lng: -5.5, width: 13, critical: false },
  { id: 'bosphorus', name: 'Bosporus Strait', lat: 41.1, lng: 29.1, width: 0.7, critical: false },
  { id: 'dardanelles', name: 'Dardanelles', lat: 40.2, lng: 26.4, width: 1.2, critical: false },
  { id: 'panama', name: 'Panama Canal', lat: 9.1, lng: -79.7, width: 0.1, critical: true },
  { id: 'dover', name: 'English Channel / Dover Strait', lat: 51.0, lng: 1.4, width: 33, critical: false },
  { id: 'tsushima', name: 'Tsushima Strait', lat: 34.5, lng: 129.5, width: 120, critical: false },
  { id: 'korean', name: 'Korea Strait', lat: 34.0, lng: 128.5, width: 195, critical: false },
  { id: 'sunda', name: 'Sunda Strait', lat: -6.0, lng: 105.8, width: 24, critical: false },
  { id: 'lombok', name: 'Lombok Strait', lat: -8.5, lng: 116.0, width: 20, critical: false },
  { id: 'makassar', name: 'Makassar Strait', lat: -2.0, lng: 119.0, width: 200, critical: false },
  { id: 'taiwan', name: 'Taiwan Strait', lat: 24.5, lng: 119.5, width: 130, critical: true }
]

export const SATELLITE_CONSTELLATIONS = [
  { name: 'Starlink', count: 5000, altitude: 550, inclination: 53 },
  { name: 'OneWeb', count: 648, altitude: 1200, inclination: 87.9 },
  { name: 'Kuiper', count: 3236, altitude: 630, inclination: 51.9 },
  { name: 'GPS', count: 31, altitude: 20200, inclination: 55 },
  { name: 'GLONASS', count: 24, altitude: 19100, inclination: 64.8 },
  { name: 'Galileo', count: 26, altitude: 23222, inclination: 56 },
  { name: 'BeiDou', count: 35, altitude: 21528, inclination: 55.5 }
]

export const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
export const USGS_EARTHQUAKE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'
export const NASA_FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/VIIRS_SNPP_NRT/world/1'
export const OPENSKY_URL = 'https://opensky-network.org/api/states/all'
export const THREATFOX_URL = 'https://threatfox.abuse.ch/export/json/recent/'
export const URLHAUS_URL = 'https://urlhaus.abuse.ch/downloads/json/'
export const CLOUDFLARE_RADAR_URL = 'https://radar.cloudflare.com/api/v1/'
export const IODA_URL = 'https://ioda.caida.org/ioda/api/outages'

export const MAP_DEFAULTS = {
  center: [20, 0],
  zoom: 2,
  minZoom: 1,
  maxZoom: 19
}

export const REFRESH_INTERVALS = {
  fast: 30000,
  normal: 120000,
  slow: 300000,
  verySlow: 900000
}

export const MAX_EVENTS = 10000
export const EVENT_TTL = 86400000

export const CII_WEIGHTS = {
  conflictDensity: 0.35,
  newsVelocity: 0.25,
  ewActivity: 0.20,
  economicStress: 0.10,
  socialUnrest: 0.10
}

export const CII_THRESHOLDS = {
  stable: 0.2,
  elevated: 0.4,
  high: 0.6,
  critical: 0.8
}

export const MAP_LEGEND = [
  { id: 'high-alert', label: 'High Alert', color: '#ff3355' },
  { id: 'elevated', label: 'Elevated', color: '#ffb800' },
  { id: 'monitoring', label: 'Monitoring', color: '#00d4ff' },
  { id: 'conflict-zone', label: 'Conflict Zone', color: '#ff5e3a' },
  { id: 'base', label: 'Military Base', color: '#b84dff' },
  { id: 'nuclear', label: 'Nuclear Site', color: '#00ff88' }
]

export const DEFCON_LEVELS = {
  5: { level: 5, label: 'FADE OUT', color: '#00ff88' },
  4: { level: 4, label: 'DOUBLE TAKE', color: '#7dff88' },
  3: { level: 3, label: 'ROUND HOUSE', color: '#ffb800' },
  2: { level: 2, label: 'FAST PACE', color: '#ff8a3a' },
  1: { level: 1, label: 'COCKED PISTOL', color: '#ff3355' }
}

export const TIME_RANGES = [
  { id: '1h', label: '1H', ms: 3600000 },
  { id: '6h', label: '6H', ms: 21600000 },
  { id: '24h', label: '24H', ms: 86400000 },
  { id: '48h', label: '48H', ms: 172800000 },
  { id: '7d', label: '7D', ms: 604800000 },
  { id: 'all', label: 'ALL', ms: Infinity }
]

export const NEWS_CHANNELS = [
  // India-first defaults. Channels are resolved server-side to their current
  // live video id (via /api/news/live) because YouTube retired the
  // `embed/live_stream?channel=` endpoint. `hls` streams play directly.
  {
    id: 'ndtv', label: 'NDTV 24x7', short: 'NDTV',
    youtubeChannel: 'UCZFMm1mMw0F81Z37aaEzTUA',
    hls: null
  },
  {
    id: 'indiatoday', label: 'India Today', short: 'IT',
    youtubeChannel: 'UCYPvAwZP8pZhSMW8qs7cVCw',
    hls: null
  },
  {
    id: 'wion', label: 'WION', short: 'WION',
    youtubeChannel: 'UC_gUM8rL-Lrg6O3adPW9K1g',
    hls: null
  },
  {
    id: 'aajtak', label: 'Aaj Tak', short: 'AT',
    youtubeChannel: 'UCt4t-jeY85JegMlZ-E5UWtA',
    hls: null
  },
  {
    id: 'republic', label: 'Republic World', short: 'REP',
    youtubeChannel: 'UCwqusr8YDwM-3mEYTDeJHzw',
    hls: null
  },
  {
    id: 'ddnews', label: 'DD News', short: 'DD',
    youtubeChannel: 'UCKwucPzHZ7zCUIf7If-Wo1g',
    hls: null
  },
  {
    id: 'bloomberg', label: 'Bloomberg', short: 'BBG',
    youtubeChannel: 'UCIALMKvObZNtJ6AmdCLP7Lg',
    hls: null
  },
  {
    id: 'skynews', label: 'Sky News', short: 'SKY',
    youtubeChannel: 'UCoMdktPbSTixAyNGwb-UYkQ',
    hls: null
  },
  {
    id: 'euronews', label: 'Euronews', short: 'EUR',
    youtubeChannel: 'UCSrZ3UV4jOidv8ppoVuvW9Q',
    hls: null
  },
  {
    id: 'dw', label: 'DW News', short: 'DW',
    youtubeChannel: 'UCknLrEdhRCp1aegoMqRaCZg',
    hls: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8'
  },
  {
    id: 'cnn', label: 'CNN', short: 'CNN',
    youtubeChannel: 'UCupvZG-5ko_eiXAupbDfxWw',
    hls: null
  },
  {
    id: 'france24', label: 'France 24', short: 'F24',
    youtubeChannel: 'UCQfwfsi5VrQ8yKZ-UWmAEFg',
    hls: 'https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8'
  },
  {
    id: 'alarabiya', label: 'Al Arabiya', short: 'ARA',
    youtubeChannel: 'UCRtLm6DQGv2L4-eHLdJY6EA',
    hls: 'https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8'
  },
  {
    id: 'aljazeera', label: 'Al Jazeera', short: 'AJ',
    youtubeChannel: 'UCNye-wNBqNL5ZzHSJj3l8Bg',
    hls: 'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index.m3u8'
  }
]

export const WEBCAM_REGIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'india', label: 'INDIA' },
  { id: 'mideast', label: 'MIDEAST' },
  { id: 'europe', label: 'EUROPE' },
  { id: 'americas', label: 'AMERICAS' },
  { id: 'asia', label: 'ASIA' },
  { id: 'space', label: 'SPACE' }
]

export const WEBCAM_FEEDS = [
  // Verified live YouTube sources. `channel` is resolved to the current live
  // video id server-side (via /api/news/live); `video` pins a specific live
  // video (EarthCam rotates cities, so its cams are pinned by video id) and is
  // verified in the background.
  { id: 'goldentemple', name: 'Amritsar · Golden Temple (Live Darshan)', country: 'India', region: 'india', lat: 31.62, lng: 74.876, channel: 'UCYn6UEtQ771a_OWSiNBoG8w' },
  { id: 'newdelhi', name: 'New Delhi · Live Feed', country: 'India', region: 'india', lat: 28.6139, lng: 77.209, channel: 'UCZFMm1mMw0F81Z37aaEzTUA' },
  { id: 'mumbai', name: 'Mumbai · Live Feed', country: 'India', region: 'india', lat: 19.076, lng: 72.8777, channel: 'UCYPvAwZP8pZhSMW8qs7cVCw' },
  { id: 'nyc', name: 'New York · Times Square', country: 'USA', region: 'americas', lat: 40.758, lng: -73.985, video: 'JQ_jwk_7OVE' },
  { id: 'london', name: 'London · Abbey Road', country: 'UK', region: 'europe', lat: 51.532, lng: -0.178, video: 'zMCea32gpmg' },
  { id: 'jerusalem', name: 'Jerusalem · Western Wall', country: 'Israel', region: 'mideast', lat: 31.777, lng: 35.235, video: '77akujLn4k8' },
  { id: 'tokyo', name: 'Tokyo · Shinjuku Crossing', country: 'Japan', region: 'asia', lat: 35.695, lng: 139.703, channel: 'UCuv7xqb-jo3HEFMIVLTY_CA' },
  { id: 'ukraine', name: 'Ukraine · Live Skylines', country: 'Ukraine', region: 'europe', lat: 50.45, lng: 30.523, channel: 'UCper-NWj8xdXacSpFtF4Mgg' },
  { id: 'iss', name: 'ISS · Earth 4K', country: 'Orbit', region: 'space', lat: 0, lng: 0, channel: 'UCkvW_7kp9LJrztmgA4q4bJQ' },
  { id: 'nasa', name: 'NASA TV', country: 'Space', region: 'space', lat: 0, lng: 0, channel: 'UCLA_DiR1FfKNvjuUpBHmylQ' }
]

export const HEATMAP_ZONES = [
  {
    id: 'ukraine', label: 'Ukraine', color: '#ff3355', intensity: 0.95,
    ring: [[52.3, 31.5], [52.0, 35.5], [50.5, 38.5], [48.5, 39.5], [46.0, 36.5], [45.3, 33.0], [46.5, 30.5], [48.5, 27.5], [50.0, 26.5], [51.5, 27.5]]
  },
  {
    id: 'middle-east', label: 'Levant / Middle East', color: '#ff5e3a', intensity: 0.9,
    ring: [[37.0, 35.5], [38.0, 42.0], [36.0, 46.0], [32.0, 48.5], [29.0, 48.0], [29.5, 34.5], [31.5, 34.2], [34.0, 35.5]]
  },
  {
    id: 'iran', label: 'Iran', color: '#ffb800', intensity: 0.75,
    ring: [[39.5, 44.0], [39.0, 48.0], [37.0, 54.0], [38.5, 60.5], [35.5, 61.5], [31.5, 61.0], [27.0, 59.0], [25.5, 57.0], [29.0, 48.5], [33.0, 45.5], [37.0, 44.0]]
  },
  {
    id: 'red-sea', label: 'Red Sea / Yemen', color: '#ff5e3a', intensity: 0.85,
    ring: [[16.5, 41.5], [16.0, 45.0], [14.0, 49.0], [12.0, 52.0], [12.5, 44.0], [13.5, 42.5], [15.0, 41.0]]
  },
  {
    id: 'taiwan', label: 'Taiwan Strait', color: '#ffb800', intensity: 0.8,
    ring: [[26.5, 118.5], [26.5, 122.5], [23.0, 123.5], [21.5, 120.5], [23.5, 118.0]]
  },
  {
    id: 'south-china-sea', label: 'South China Sea', color: '#ffb800', intensity: 0.7,
    ring: [[21.0, 108.0], [21.5, 118.0], [15.0, 118.5], [8.0, 115.0], [7.5, 108.0], [12.0, 107.0], [17.0, 108.5]]
  },
  {
    id: 'korea', label: 'Korean Peninsula', color: '#ffb800', intensity: 0.7,
    ring: [[43.0, 124.5], [43.0, 130.5], [38.0, 129.5], [34.5, 126.5], [36.0, 124.5]]
  },
  {
    id: 'sahel', label: 'Sahel', color: '#ff8a3a', intensity: 0.6,
    ring: [[20.0, -17.0], [22.0, 15.0], [15.0, 25.0], [11.0, 15.0], [12.0, -5.0], [16.0, -16.0]]
  },
  {
    id: 'gaza', label: 'Gaza', color: '#ff3355', intensity: 1.0,
    ring: [[31.6, 34.2], [31.6, 34.6], [31.2, 34.6], [31.2, 34.2]]
  }
]

export const MILITARY_BASES = [
  { id: 'ramstein', name: 'Ramstein AB', country: 'DE', lat: 49.44, lng: 7.6 },
  { id: 'aludeid', name: 'Al Udeid AB', country: 'QA', lat: 25.117, lng: 51.315 },
  { id: 'diego', name: 'Diego Garcia', country: 'IO', lat: -7.313, lng: 72.411 },
  { id: 'yokosuka', name: 'Yokosuka Naval Base', country: 'JP', lat: 35.293, lng: 139.671 },
  { id: 'kadena', name: 'Kadena AB', country: 'JP', lat: 26.356, lng: 127.768 },
  { id: 'camphumphreys', name: 'Camp Humphreys', country: 'KR', lat: 36.96, lng: 127.03 },
  { id: 'incirlik', name: 'Incirlik AB', country: 'TR', lat: 37.002, lng: 35.426 },
  { id: 'ramatdavid', name: 'Ramat David AB', country: 'IL', lat: 32.665, lng: 35.18 },
  { id: 'dhafer', name: 'Al Dhafra AB', country: 'AE', lat: 24.248, lng: 54.548 },
  { id: 'bahrain', name: 'NSA Bahrain', country: 'BH', lat: 26.21, lng: 50.61 },
  { id: 'guam', name: 'Andersen AFB Guam', country: 'GU', lat: 13.584, lng: 144.93 },
  { id: 'norfolk', name: 'Naval Station Norfolk', country: 'US', lat: 36.947, lng: -76.31 },
  { id: 'sandiego', name: 'Naval Base San Diego', country: 'US', lat: 32.68, lng: -117.12 },
  { id: 'pearl', name: 'Pearl Harbor', country: 'US', lat: 21.35, lng: -157.95 },
  { id: 'tartus', name: 'Tartus Naval Facility', country: 'SY', lat: 34.9, lng: 35.87 },
  { id: 'sevastopol', name: 'Sevastopol', country: 'UA', lat: 44.62, lng: 33.53 },
  { id: 'kaliningrad', name: 'Kaliningrad', country: 'RU', lat: 54.71, lng: 20.51 },
  { id: 'vladivostok', name: 'Vladivostok', country: 'RU', lat: 43.12, lng: 131.89 }
]

export const NUCLEAR_SITES = [
  { id: 'zaporizhzhia', name: 'Zaporizhzhia NPP', country: 'UA', lat: 47.512, lng: 34.585 },
  { id: 'chernobyl', name: 'Chernobyl', country: 'UA', lat: 51.389, lng: 30.099 },
  { id: 'bushehr', name: 'Bushehr NPP', country: 'IR', lat: 28.83, lng: 50.89 },
  { id: 'natanz', name: 'Natanz Enrichment', country: 'IR', lat: 33.72, lng: 51.73 },
  { id: 'fordow', name: 'Fordow Fuel Enrichment', country: 'IR', lat: 34.885, lng: 50.996 },
  { id: 'dimona', name: 'Negev Nuclear Center', country: 'IL', lat: 31.0, lng: 35.14 },
  { id: 'yongbyon', name: 'Yongbyon', country: 'KP', lat: 39.795, lng: 125.755 },
  { id: 'kudankulam', name: 'Kudankulam NPP', country: 'IN', lat: 8.168, lng: 77.713 },
  { id: 'tarapur', name: 'Tarapur NPP', country: 'IN', lat: 19.83, lng: 72.66 },
  { id: 'karachi', name: 'Karachi NPP (KANUPP)', country: 'PK', lat: 24.84, lng: 66.79 },
  { id: 'fuqing', name: 'Fuqing NPP', country: 'CN', lat: 25.45, lng: 119.45 },
  { id: 'taishan', name: 'Taishan NPP', country: 'CN', lat: 21.92, lng: 112.98 },
  { id: 'flamanville', name: 'Flamanville NPP', country: 'FR', lat: 49.537, lng: -1.882 },
  { id: 'sellafield', name: 'Sellafield', country: 'GB', lat: 54.42, lng: -3.5 },
  { id: 'palo', name: 'Palo Verde NGS', country: 'US', lat: 33.389, lng: -112.865 },
  { id: 'three-mile', name: 'Three Mile Island', country: 'US', lat: 40.153, lng: -76.725 }
]

export const INTEL_HOTSPOTS = [
  { id: 'crimea', name: 'Crimea', lat: 45.3, lng: 34.4, radius: 320000, level: 'critical' },
  { id: 'donbas', name: 'Donbas Front', lat: 48.0, lng: 37.8, radius: 300000, level: 'critical' },
  { id: 'gaza-hot', name: 'Gaza Strip', lat: 31.4, lng: 34.4, radius: 120000, level: 'critical' },
  { id: 'lebanon', name: 'Southern Lebanon', lat: 33.3, lng: 35.4, radius: 150000, level: 'high' },
  { id: 'redsea-hot', name: 'Bab el-Mandeb', lat: 12.6, lng: 43.4, radius: 250000, level: 'critical' },
  { id: 'hormuz-hot', name: 'Strait of Hormuz', lat: 26.6, lng: 56.2, radius: 200000, level: 'high' },
  { id: 'taiwan-hot', name: 'Taiwan Strait', lat: 24.5, lng: 119.5, radius: 300000, level: 'high' },
  { id: 'sahel-hot', name: 'Sahel', lat: 14.5, lng: 0.0, radius: 900000, level: 'medium' },
  { id: 'korea-hot', name: 'DMZ', lat: 38.0, lng: 127.0, radius: 150000, level: 'high' },
  { id: 'kashmir', name: 'Kashmir LoC', lat: 34.1, lng: 74.8, radius: 220000, level: 'high' }
]

export const PIPELINES = [
  {
    id: 'nordstream', name: 'Nord Stream', color: '#00d4ff',
    path: [[60.0, 28.5], [59.0, 24.0], [57.5, 20.0], [55.5, 16.0], [54.5, 13.5]]
  },
  {
    id: 'druzhba', name: 'Druzhba', color: '#ffb800',
    path: [[55.5, 52.0], [53.5, 39.0], [52.0, 30.0], [51.5, 24.0], [50.0, 18.0], [48.5, 14.0]]
  },
  {
    id: 'tapco', name: 'TAP / TANAP', color: '#00ff88',
    path: [[40.5, 49.0], [40.0, 44.0], [39.5, 38.0], [40.5, 32.0], [41.0, 26.0], [40.9, 24.0]]
  }
]

