import React, { useEffect, useRef, useState } from 'react'
import { Tv, Signal, AlertTriangle } from 'lucide-react'
import Hls from 'hls.js'
import { NEWS_CHANNELS } from '../../utils/constants.js'
import { useLiveVideo } from '../../hooks/useLiveVideo.js'
import { Dot } from './ui.jsx'

const HlsPlayer = ({ url, onStatus }) => {
  const videoRef = useRef(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    let hls
    onStatus('connecting')
    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, enableWorker: true })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => { onStatus('live'); video.play().catch(() => {}) })
      hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) onStatus('error') })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('loadedmetadata', () => { onStatus('live'); video.play().catch(() => {}) })
    } else {
      onStatus('error')
    }
    return () => { if (hls) hls.destroy() }
  }, [url, onStatus])
  return <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
}

const NewsPlayer = () => {
  const [active, setActive] = useState(NEWS_CHANNELS[0].id)
  const [hlsStatus, setHlsStatus] = useState('connecting')
  const channel = NEWS_CHANNELS.find((c) => c.id === active)
  const useHls = Boolean(channel.hls)
  const yt = useLiveVideo({ channel: useHls ? null : channel.youtubeChannel })

  const selectChannel = (id) => {
    setActive(id)
    setHlsStatus('connecting')
  }

  const status = useHls
    ? hlsStatus
    : yt.loading
      ? 'connecting'
      : yt.error
        ? 'error'
        : 'live'

  const statusColor = status === 'live' ? '#7CD3EA' : status === 'connecting' ? '#F0AE4B' : '#FF5E4F'
  const statusLabel = status === 'live' ? 'LIVE' : status === 'connecting' ? 'BUFFERING' : 'SIGNAL LOST'

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-1 border-b border-[var(--color-line)] pb-2">
        {NEWS_CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => selectChannel(c.id)}
            className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${active === c.id ? 'bg-[var(--color-coral)] font-medium text-[var(--color-ink)]' : 'text-[var(--color-faint)] hover:text-[var(--color-bone)]'}`}
          >
            {c.short}
          </button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--color-line)] bg-black">
        {useHls ? (
          <HlsPlayer key={channel.id} url={channel.hls} onStatus={setHlsStatus} />
        ) : yt.videoId ? (
          <iframe
            key={yt.videoId}
            title={channel.label}
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${yt.videoId}?autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : null}

        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-black/70 border border-[var(--color-border-primary)] pointer-events-none">
          <Tv className="h-3 w-3 text-[var(--color-ice)]" />
          <span className="text-xs text-[var(--color-bone)]">{channel.label}</span>
        </div>

        <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-black/70 border border-[var(--color-border-primary)] pointer-events-none">
          <Dot color={statusColor} pulse={status === 'live'} />
          <span className="text-xs" style={{ color: statusColor }}>{statusLabel}</span>
        </div>

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/80">
            <AlertTriangle className="h-5 w-5 text-[var(--color-coral)]" />
            <span className="text-xs text-[var(--color-mute)]">Feed unavailable · select another channel</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-ice)] to-transparent opacity-40" />
      </div>

      <div className="mt-2 flex shrink-0 items-center justify-between">
        <span className="text-[11px] text-[var(--color-faint)]">Live news channel · YouTube / HLS</span>
        <span className="flex items-center gap-1 text-[11px] text-[var(--color-faint)]">
          <Signal className="h-3 w-3" /> Auto-refresh on switch
        </span>
      </div>
    </div>
  )
}

export default NewsPlayer
