/**
 * Layer: hooks (rank 4) — resolve a live YouTube video id.
 *
 * The legacy `youtube.com/embed/live_stream?channel=<ID>` endpoint is retired,
 * so a channel must be resolved to its current live video id before embedding.
 * Given a `channel`, we ask the backend for the current live video; given a
 * pinned `video`, we embed it immediately and verify it in the background.
 * Auto-refreshes so long-running dashboards follow stream rotations.
 */
import { useEffect, useRef, useState } from 'react'
import { getChannelLive, verifyVideo } from '../services/news.js'

const REFRESH_MS = 300000

/**
 * @param {{ channel?: string|null, video?: string|null }} source
 * @returns {{ videoId: string|null, live: boolean, loading: boolean, error: boolean }}
 */
export function useLiveVideo({ channel = null, video = null }) {
  const [state, setState] = useState({
    videoId: video || null,
    live: false,
    loading: Boolean(channel) || (!channel && !video),
    error: false
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (!channel && !video) {
      setState({ videoId: null, live: false, loading: false, error: false })
      return undefined
    }

    const resolve = async () => {
      try {
        const data = channel ? await getChannelLive(channel) : await verifyVideo(video)
        if (!mounted.current) return
        const videoId = data?.videoId || null
        const live = Boolean(data?.live && videoId)
        setState({ videoId, live, loading: false, error: !live })
      } catch {
        if (!mounted.current) return
        // For pinned videos keep the id so the embed still renders; flag error.
        setState({ videoId: video || null, live: false, loading: false, error: true })
      }
    }

    if (channel) setState({ videoId: null, live: false, loading: true, error: false })
    resolve()
    const id = setInterval(resolve, REFRESH_MS)
    return () => {
      mounted.current = false
      clearInterval(id)
    }
  }, [channel, video])

  return state
}
