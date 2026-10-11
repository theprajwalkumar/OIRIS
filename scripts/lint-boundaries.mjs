#!/usr/bin/env node
/**
 * Boundary linter — enforces architectural layering.
 *
 * Rules
 * 1. Frontend (`src/`) is layered low -> high. A module may only import
 *    from the same layer or lower:
 *
 *      types       0
 *      config      1
 *      utils       1
 *      services    2
 *      context     3
 *      hooks       4
 *      components  5
 *      app         6   (src/App.jsx, src/main.jsx, other top-level src files)
 *
 * 2. The server (`server/`) must not import from the frontend (`src/`),
 *    and the frontend must not import from the server.
 *
 * Imports of npm packages and non-code assets are ignored. Run with
 * `--json` for machine-readable output.
 *
 * Exit code 1 when any violation is found.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const SRC = 'src'
const SERVER = 'server'

const LAYER_RANKS = {
  types: 0,
  config: 1,
  utils: 1,
  services: 2,
  context: 3,
  hooks: 4,
  components: 5
}
const APP_RANK = 6
const APP_FILES = new Set(['src/App.jsx', 'src/main.jsx'])
const CODE_EXT = new Set(['.js', '.jsx', '.mjs'])
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage'])

const IMPORT_RE = /(?:^|[^\w.])import\s+[^'"`]*?from\s*['"]([^'"]+)['"]/g
const BARE_IMPORT_RE = /(?:^|[^\w.])import\s*['"]([^'"]+)['"]/g
const EXPORT_FROM_RE = /export\s+[^'"`]*?from\s*['"]([^'"]+)['"]/g
const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g

/** @param {string} absDir @returns {string[]} file paths relative to repoRoot */
function walk(absDir) {
  const out = []
  let entries
  try {
    entries = readdirSync(absDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      out.push(...walk(join(absDir, entry.name)))
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.'))
      if (CODE_EXT.has(ext)) out.push(relative(repoRoot, join(absDir, entry.name)))
    }
  }
  return out
}

/** @param {string} fileRel @param {string} code @returns {string[]} import specifiers */
function extractSpecifiers(code) {
  const specs = new Set()
  for (const re of [IMPORT_RE, BARE_IMPORT_RE, EXPORT_FROM_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(code)) !== null) specs.add(match[1])
  }
  return Array.from(specs)
}

/** @param {string} fileRel @param {string} spec @returns {string|null} repo-relative target */
function resolveRelative(fileRel, spec) {
  if (!spec.startsWith('.')) return null
  const target = normalize(join(dirname(fileRel), spec))
  return target.split(sep).join('/')
}

/** Layer rank for a repo-relative src path, or null if unranked/not-src. */
function layerRank(targetRel) {
  const parts = targetRel.split('/')
  if (parts[0] !== SRC) return null
  if (APP_FILES.has(targetRel)) return APP_RANK
  if (parts.length < 2) return APP_RANK
  const dir = parts[1]
  return Object.prototype.hasOwnProperty.call(LAYER_RANKS, dir) ? LAYER_RANKS[dir] : null
}

function scopeOf(relPath) {
  const parts = relPath.split('/')
  if (parts[0] === SRC) return SRC
  if (parts[0] === SERVER) return SERVER
  return null
}

const ASSET_EXTS = new Set([
  '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.json'
])

function isCodeSpec(spec) {
  const clean = spec.split('?')[0].split('#')[0]
  const dot = clean.lastIndexOf('.')
  const slash = clean.lastIndexOf('/')
  if (dot > slash && ASSET_EXTS.has(clean.slice(dot))) return false
  return true
}

function main() {
  const jsonMode = process.argv.includes('--json')
  const files = [...walk(join(repoRoot, SRC)), ...walk(join(repoRoot, SERVER))]
  const violations = []

  for (const fileRel of files) {
    const code = readFileSync(join(repoRoot, fileRel), 'utf8')
    const importerScope = scopeOf(fileRel)
    const importerRank = importerScope === SRC ? layerRank(fileRel) : null

    for (const spec of extractSpecifiers(code)) {
      const targetRel = resolveRelative(fileRel, spec)
      if (!targetRel) continue
      const targetScope = scopeOf(targetRel)
      if (!targetScope) continue
      if (!isCodeSpec(spec)) continue

      // Rule 2: no cross-boundary between src and server.
      if (importerScope !== targetScope) {
        violations.push({
          file: fileRel,
          spec,
          target: targetRel,
          rule: 'cross-boundary',
          message: `${importerScope}/ must not import from ${targetScope}/`
        })
        continue
      }

      // Rule 1: layer ordering within src.
      if (importerScope === SRC && importerRank !== null) {
        const importedRank = layerRank(targetRel)
        if (importedRank !== null && importedRank > importerRank) {
          violations.push({
            file: fileRel,
            spec,
            target: targetRel,
            rule: 'layer-order',
            message: `rank ${importerRank} imports rank ${importedRank} (must import same or lower)`
          })
        }
      }
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify({ ok: violations.length === 0, count: violations.length, violations }, null, 2))
  } else if (violations.length === 0) {
    console.log(`✓ boundaries OK (${files.length} files scanned)`)
  } else {
    console.error(`✗ ${violations.length} boundary violation(s):\n`)
    for (const v of violations) {
      console.error(`  ${v.file}`)
      console.error(`    imports "${v.spec}" -> ${v.target}`)
      console.error(`    ${v.rule}: ${v.message}\n`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}

main()
