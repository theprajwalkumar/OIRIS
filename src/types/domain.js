/**
 * Layer: types (rank 0) — pure type/typedef declarations.
 * MUST NOT import from any other layer. No runtime side effects.
 *
 * These JSDoc typedefs document the shared shapes used across the
 * app. They are the single source of truth for domain data contracts
 * and mirror the Osiris reference conventions.
 */

/**
 * @typedef {'critical'|'high'|'medium'|'info'} Severity
 */

/**
 * @typedef {Object} GeoPoint
 * @property {number} lat
 * @property {number} lng
 */

/**
 * Canonical event broadcast over the WebSocket channel and rendered on the map.
 * @typedef {Object} Event
 * @property {string} id
 * @property {number} lat
 * @property {number} lng
 * @property {Severity} severity
 * @property {string} type
 * @property {string} category
 * @property {string} title
 * @property {Object} [details]
 * @property {string} source
 * @property {number} timestamp   epoch ms
 * @property {string|null} countryCode
 */

/**
 * Normalized aircraft state (OpenSky / adsb.lol shape).
 * @typedef {Object} Flight
 * @property {string} icao24
 * @property {string} callsign
 * @property {string|null} registration
 * @property {string|null} aircraftType
 * @property {string|null} originCountry
 * @property {number} lat
 * @property {number} lng
 * @property {number|null} altitude       feet
 * @property {number|null} velocity       knots
 * @property {number} heading             degrees (0 = north)
 * @property {number} verticalRate        ft/min
 * @property {boolean} onGround
 * @property {string|null} squawk
 * @property {boolean} military
 */

/**
 * @typedef {Object} Airport
 * @property {string|null} iata
 * @property {string|null} icao
 * @property {string|null} name
 * @property {string|null} country
 * @property {number|null} lat
 * @property {number|null} lng
 */

/**
 * Route resolution result for a callsign (adsbdb).
 * @typedef {Object} FlightRoute
 * @property {boolean} found
 * @property {string} callsign
 * @property {string|null} [airline]
 * @property {Airport|null} [origin]
 * @property {Airport|null} [destination]
 */

/**
 * @typedef {Object} AircraftInfo
 * @property {boolean} found
 * @property {string} icao24
 * @property {string|null} [registration]
 * @property {string|null} [type]
 * @property {string|null} [manufacturer]
 * @property {string|null} [owner]
 */

/**
 * A single toggleable map layer definition.
 * @typedef {Object} LayerDef
 * @property {string} id
 * @property {string} label
 * @property {boolean} default
 */

/**
 * A group of related map layers.
 * @typedef {Object} LayerGroup
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} color
 * @property {string} description
 * @property {LayerDef[]} layers
 */

/**
 * Named HTTP cache tiers, expressed in seconds (s-maxage semantics).
 * Mirrors the Osiris cache-tier model.
 * @typedef {'fast'|'medium'|'slow'|'static'|'daily'|'noStore'} CacheTier
 */

/**
 * Freshness classification for a cached dataset (seed-meta equivalent).
 * @typedef {'OK'|'WARN'|'STALE'|'EMPTY'} FreshnessStatus
 */

/**
 * @typedef {Object} SeedMeta
 * @property {string} key
 * @property {number} fetchedAt
 * @property {number|null} recordCount
 * @property {number} ageMs
 * @property {FreshnessStatus} status
 */

/**
 * Backend health payload.
 * @typedef {Object} HealthStatus
 * @property {string} status
 * @property {number} [timestamp]
 * @property {number} [uptime]
 * @property {SeedMeta[]} [freshness]
 */

export {}
