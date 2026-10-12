// Build-time: bake world-atlas land-110m into a compact dot-matrix bitmask.
// No runtime dependency — the generated asset is what ships.
//
//   node scripts/build-land-mask.mjs
//
// Output: src/data/landMask.json  { step, lonCount, latCount, land: base64 bitset }
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STEP = 1.8
const SRC = 'https://unpkg.com/world-atlas@2.0.2/land-110m.json'
const CACHE = join(ROOT, 'node_modules', '.cache', 'osiris', 'land-110m.json')
const OUT = join(ROOT, 'src', 'data', 'landMask.json')

// --- minimal TopoJSON decode -------------------------------------------------
function decodeArcs(topology) {
  const { transform, arcs } = topology
  return arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map((d) => {
      x += d[0]
      y += d[1]
      return transform
        ? [x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]]
        : [x, y]
    })
  })
}

function ringCoords(arcIdxs, decoded) {
  const out = []
  for (const idx of arcIdxs) {
    const arc = idx < 0 ? decoded[~idx].slice().reverse() : decoded[idx]
    for (let i = 0; i < arc.length; i++) {
      if (out.length && i === 0) continue
      out.push(arc[i])
    }
  }
  return out
}

function collectPolygons(topology) {
  const decoded = decodeArcs(topology)
  const polygons = []
  const walk = (geom) => {
    if (!geom) return
    if (geom.type === 'MultiPolygon') {
      for (const poly of geom.arcs) polygons.push(poly.map((ring) => ringCoords(ring, decoded)))
    } else if (geom.type === 'Polygon') {
      polygons.push(geom.arcs.map((ring) => ringCoords(ring, decoded)))
    } else if (geom.type === 'GeometryCollection') {
      geom.geometries.forEach(walk)
    }
  }
  for (const obj of Object.values(topology.objects)) walk(obj)
  return polygons
}

// --- rasterize ---------------------------------------------------------------
function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function inPolygon(lon, lat, rings, bbox) {
  if (lon < bbox[0] || lon > bbox[1] || lat < bbox[2] || lat > bbox[3]) return false
  if (!pointInRing(lon, lat, rings[0])) return false
  for (let h = 1; h < rings.length; h++) if (pointInRing(lon, lat, rings[h])) return false
  return true
}

const bboxOf = (rings) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return [minX, maxX, minY, maxY]
}

async function loadSource() {
  mkdirSync(dirname(CACHE), { recursive: true })
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'))
  const res = await fetch(SRC)
  if (!res.ok) throw new Error(`fetch ${SRC} → ${res.status}`)
  const text = await res.text()
  writeFileSync(CACHE, text)
  return JSON.parse(text)
}

const topology = await loadSource()
const polygons = collectPolygons(topology).map((rings) => ({ rings, bbox: bboxOf(rings) }))

const lonCount = Math.floor(360 / STEP)
const latCount = Math.floor(180 / STEP)
const bits = Buffer.alloc(Math.ceil((lonCount * latCount) / 8))

let landCells = 0
for (let j = 0; j < latCount; j++) {
  const lat = 90 - (j + 0.5) * STEP
  for (let i = 0; i < lonCount; i++) {
    const lon = -180 + (i + 0.5) * STEP
    if (polygons.some((p) => inPolygon(lon, lat, p.rings, p.bbox))) {
      const n = j * lonCount + i
      bits[n >> 3] |= 1 << (7 - (n & 7))
      landCells++
    }
  }
}

const payload = {
  version: 1,
  step: STEP,
  lonCount,
  latCount,
  landCells,
  land: bits.toString('base64')
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(payload))

const kb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(1)
console.log(`land-110m → ${landCells}/${lonCount * latCount} cells (${((landCells / (lonCount * latCount)) * 100).toFixed(1)}%)`)
console.log(`wrote ${OUT} (${kb} KB, ${polygons.length} polygons)`)