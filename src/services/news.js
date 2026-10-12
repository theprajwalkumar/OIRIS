/**
 * Layer: services (rank 2) — live video resolution.
 *
 * Thin wrapper over `/api/news/live` and `/api/news/verify`. The backend
 * resolves a YouTube channel's current live video id (the legacy
 * `embed/live_stream?channel=` endpoint is retired) and verifies pinned videos.
 */
import { requestJson } from './http.js'

/**
 * Resolve a channel's current live video.
 * @param {string} channel YouTube channel id (e.g. UC...)
 * @returns {Promise<{ channel: string, videoId: string|null, live: boolean, title: string|null, timestamp: number }>}
 */
export function getChannelLive(channel) {
  return requestJson('/api/news/live', { params: { channel } })
}

/**
 * Verify a pinned video id is still live.
 * @param {string} video YouTube video id
 * @returns {Promise<{ videoId: string, live: boolean, title: string|null, timestamp: number }>}
 */
export function verifyVideo(video) {
  return requestJson('/api/news/verify', { params: { video } })
}
