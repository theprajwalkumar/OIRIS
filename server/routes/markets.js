/**
 * Layer: server route — realtime market data (keyless).
 *
 * Source: Yahoo Finance public chart endpoint (no API key). One request per
 * symbol, coalesced server-side and cached briefly so a 15s client poll does
 * not stampede upstream. Symbols are curated for an India-first national
 * picture (indices, large-caps, USD/INR, commodities, crypto).
 */
import { Router } from 'express'
import fetch from 'node-fetch'
import { createCache, cachedFetchJson, writeSeedMeta } from '../cache.js'

const router = Router()

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const FETCH_TIMEOUT = 12000
const CONCURRENCY = 6
const SNAPSHOT_TTL_MS = 15000

const cache = createCache()

const MARKET_GROUPS = Object.freeze([
  {
    id: 'india-indices',
    label: 'India Indices',
    symbols: [
      { symbol: '^NSEI', name: 'NIFTY 50' },
      { symbol: '^BSESN', name: 'SENSEX' },
      { symbol: '^NSEBANK', name: 'BANK NIFTY' },
      { symbol: '^CNXIT', name: 'NIFTY IT' },
      { symbol: '^INDIAVIX', name: 'INDIA VIX' }
    ]
  },
  {
    id: 'india-equities',
    label: 'India Equities',
    symbols: [
      { symbol: 'RELIANCE.NS', name: 'Reliance' },
      { symbol: 'TCS.NS', name: 'TCS' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'INFY.NS', name: 'Infosys' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'SBIN.NS', name: 'SBI' },
      { symbol: 'ITC.NS', name: 'ITC' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro' },
      { symbol: 'ADANIENT.NS', name: 'Adani Ent.' }
    ]
  },
  {
    id: 'global',
    label: 'Global Markets',
    symbols: [
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^DJI', name: 'Dow Jones' },
      { symbol: '^FTSE', name: 'FTSE 100' },
      { symbol: '^N225', name: 'Nikkei 225' }
    ]
  },
  {
    id: 'fx-commodities',
    label: 'FX · Commodities · Crypto',
    symbols: [
      { symbol: 'INR=X', name: 'USD/INR' },
      { symbol: 'EURINR=X', name: 'EUR/INR' },
      { symbol: 'GC=F', name: 'Gold (oz)' },
      { symbol: 'CL=F', name: 'WTI Crude' },
      { symbol: 'BTC-USD', name: 'Bitcoin' },
      { symbol: 'ETH-USD', name: 'Ethereum' }
    ]
  }
])

async function fetchJSON(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Osiris/1.0; OSINT dashboard)',
        Accept: 'application/json'
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      try {
        results[idx] = await fn(items[idx])
      } catch {
        results[idx] = null
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function round(n, dp = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const f = 10 ** dp
  return Math.round(n * f) / f
}

async function fetchQuote({ symbol, name }) {
  const url = `${YAHOO_CHART}/${encodeURIComponent(symbol)}?interval=5m&range=1d`
  const data = await fetchJSON(url)
  const result = data?.chart?.result?.[0]
  if (!result) return null
  const meta = result.meta || {}
  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null
  const prev = typeof meta.previousClose === 'number'
    ? meta.previousClose
    : (typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : null)
  if (price == null) return null
  const change = prev != null ? price - prev : null
  const changePct = prev != null && prev !== 0 ? ((price - prev) / prev) * 100 : null

  const closes = result.indicators?.quote?.[0]?.close
  const spark = Array.isArray(closes)
    ? closes.filter((c) => typeof c === 'number' && Number.isFinite(c)).map((c) => round(c, 2)).slice(-48)
    : []

  return {
    symbol,
    name: name || meta.shortName || symbol,
    price: round(price, price < 10 ? 4 : 2),
    change: round(change),
    changePct: round(changePct),
    currency: meta.currency || null,
    exchange: meta.exchangeName || null,
    marketState: meta.marketState || null,
    spark
  }
}

router.get('/markets', async (req, res) => {
  try {
    const { data, cached } = await cachedFetchJson(
      cache,
      'markets:snapshot',
      async () => {
        const groups = await Promise.all(
          MARKET_GROUPS.map(async (group) => {
            const items = await mapLimit(group.symbols, CONCURRENCY, fetchQuote)
            return { id: group.id, label: group.label, items: items.filter(Boolean) }
          })
        )
        const recordCount = groups.reduce((sum, g) => sum + g.items.length, 0)
        if (!recordCount) throw new Error('all market symbols failed')
        writeSeedMeta('markets', { recordCount, ttlMs: SNAPSHOT_TTL_MS })
        return { groups, source: 'yahoo', timestamp: Date.now() }
      },
      { ttlMs: SNAPSHOT_TTL_MS }
    )
    res.json({ ...data, cached })
  } catch (err) {
    console.error('[markets] snapshot failed:', err.message)
    res.status(502).json({ groups: [], source: 'yahoo', error: err.message, timestamp: Date.now() })
  }
})

export default router
