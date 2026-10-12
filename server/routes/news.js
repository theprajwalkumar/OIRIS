/**
 * Layer: server route — live video resolution (keyless).
 *
 * YouTube retired the `youtube.com/embed/live_stream?channel=<ID>` endpoint, so
 * embedding a channel by ID no longer renders. Instead we resolve the channel's
 * *current* live video id server-side by reading the channel `/live` page and
 * extracting the `<link rel="canonical" href=".../watch?v=ID">` (YouTube points
 * the canonical at the live watch page only while the channel is broadcasting).
 * The client then embeds `youtube.com/embed/<videoId>`, which is stable and
 * auto-rotates as live ids change.
 *
 * Keyless, cached (in-flight coalesced) so many webcam tiles sharing a channel
 * trigger at most one upstream fetch per TTL window.
 */
import { Router } from 'express'
import fetch from 'node-fetch'
import { createCache, cachedFetchJson, writeSeedMeta } from '../cache.js'

const router = Router()

const FETCH_TIMEOUT = 12000
const LIVE_TTL_MS = 120000

const cache = createCache()

const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

async function fetchHtml(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extract the live video id + title from a channel `/live` page.
 * @param {string} html
 * @returns {{ videoId: string|null, title: string|null }}
 */
function parseLivePage(html) {
  const canonical = html.match(
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/
  )
  let videoId = canonical?.[1] || null

  // Fallback: first videoId only if the page explicitly marks a live item.
  if (!videoId && /"isLive":true/.test(html)) {
    const m = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)
    if (m) videoId = m[1]
  }

  const titleM =
    html.match(/<meta property="og:title" content="([^"]*)"/) ||
    html.match(/<meta name="title" content="([^"]*)"/)
  const title = titleM ? decodeEntities(titleM[1]) : null

  return { videoId, title }
}

router.get('/news/live', async (req, res) => {
  const channel = String(req.query.channel || '').trim()
  if (!CHANNEL_ID_RE.test(channel)) {
    res.status(400).json({ videoId: null, live: false, error: 'invalid channel id' })
    return
  }

  try {
    const { data, cached } = await cachedFetchJson(
      cache,
      `news:live:${channel}`,
      async () => {
        const html = await fetchHtml(`https://www.youtube.com/channel/${channel}/live`)
        const parsed = parseLivePage(html)
        writeSeedMeta('news-live', {
          recordCount: parsed.videoId ? 1 : 0,
          ttlMs: LIVE_TTL_MS
        })
        return {
          channel,
          videoId: parsed.videoId || null,
          live: Boolean(parsed.videoId),
          title: parsed.title || null,
          timestamp: Date.now()
        }
      },
      { ttlMs: LIVE_TTL_MS }
    )
    res.json({ ...data, cached })
  } catch (err) {
    console.error('[news] live resolve failed:', err.message)
    res.status(502).json({ channel, videoId: null, live: false, error: err.message })
  }
})

router.get('/news/verify', async (req, res) => {
  const video = String(req.query.video || '').trim()
  if (!VIDEO_ID_RE.test(video)) {
    res.status(400).json({ videoId: null, live: false, error: 'invalid video id' })
    return
  }
  try {
    const { data, cached } = await cachedFetchJson(
      cache,
      `news:verify:${video}`,
      async () => {
        const html = await fetchHtml(`https://www.youtube.com/watch?v=${video}`)
        const live = /"isLive":true/.test(html)
        const titleM =
          html.match(/<meta property="og:title" content="([^"]*)"/) ||
          html.match(/<meta name="title" content="([^"]*)"/)
        return {
          videoId: video,
          live,
          title: titleM ? decodeEntities(titleM[1]) : null,
          timestamp: Date.now()
        }
      },
      { ttlMs: LIVE_TTL_MS }
    )
    res.json({ ...data, cached })
  } catch (err) {
    console.error('[news] verify failed:', err.message)
    res.status(502).json({ videoId: video, live: false, error: err.message })
  }
})

export default router
