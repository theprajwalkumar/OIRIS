export default async function handler(req, res) {
  const targets = {
    yahoo: 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=5m&range=1d',
    coingecko: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    stooq: 'https://stooq.com/q/l/?s=%5Espx&f=sd2t2ohlcv&h&e=csv',
    frankfurter: 'https://api.frankfurter.app/latest?from=USD&to=INR',
    youtube: 'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DSChm4DyivOU&format=json',
    opensky: 'https://opensky-network.org/api/states/all'
  }
  const out = {}
  for (const [k, url] of Object.entries(targets)) {
    const t = Date.now()
    const c = new AbortController()
    const to = setTimeout(() => c.abort(), 8000)
    try {
      const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
      out[k] = { status: r.status, ms: Date.now() - t }
    } catch (e) {
      out[k] = { error: e.name + ': ' + e.message, ms: Date.now() - t }
    } finally {
      clearTimeout(to)
    }
  }
  res.status(200).json(out)
}
