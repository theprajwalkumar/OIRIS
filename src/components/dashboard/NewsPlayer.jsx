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

  const statusColor = status === 'live' ? '#00ff88' : status === 'connecting' ? '#ffb800' : '#ff3355'
  const statusLabel = status === 'live' ? 'LIVE' : status === 'connecting' ? 'BUFFERING' : 'SIGNAL LOST'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 flex-wrap border-b border-[var(--color-border-primary)] pb-1.5 mb-1.5 shrink-0">
        {NEWS_CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => selectChannel(c.id)}
            className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] tracking-wider transition-colors ${active === c.id ? 'bg-[var(--color-accent-crimson)] text-white font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
          >
            {c.short}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-0 rounded border border-[var(--color-border-primary)] bg-black overflow-hidden">
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
          <Tv className="w-3 h-3 text-[var(--color-accent-cyan)]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-primary)]">{channel.label}</span>
        </div>

        <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-black/70 border border-[var(--color-border-primary)] pointer-events-none">
          <Dot color={statusColor} pulse={status === 'live'} />
          <span className="font-mono text-[9px] tracking-wider" style={{ color: statusColor }}>{statusLabel}</span>
        </div>

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/80">
            <AlertTriangle className="w-5 h-5 text-[var(--color-accent-crimson)]" />
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">FEED UNAVAILABLE · SELECT ANOTHER CHANNEL</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)] to-transparent opacity-40" />
      </div>

      <div className="flex items-center justify-between mt-1.5 shrink-0">
        <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-text-muted)]">Live News Channel · YouTube / HLS</span>
        <span className="flex items-center gap-1 font-mono text-[8px] text-[var(--color-text-muted)]">
          <Signal className="w-3 h-3" /> AUTO-REFRESH ON SWITCH
        </span>
      </div>
    </div>
  )
}

export default NewsPlayer
