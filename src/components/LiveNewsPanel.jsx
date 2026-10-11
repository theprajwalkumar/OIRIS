import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Hls from 'hls.js'
import { X, Play, Video, ChevronRight, Radio, Globe } from 'lucide-react'
import { NEWS_CHANNELS, WEBCAM_REGIONS, WEBCAM_FEEDS } from '../utils/constants.js'
import { useUI } from '../context/UIContext.jsx'

const NewsPlayer = ({ channel }) => {
  const videoRef = useRef(null)
  const [mode, setMode] = useState(channel.hls ? 'hls' : 'youtube')

  useEffect(() => {
    setMode(channel.hls ? 'hls' : 'youtube')
    const video = videoRef.current

    if (channel.hls) {
      let hls = null
      if (video) {
        if (Hls.isSupported()) {
          hls = new Hls({ autoStartLoad: true, maxBufferLength: 30 })
          hls.loadSource(channel.hls)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setMode('youtube')
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = channel.hls
          video.play().catch(() => {})
        } else {
          setMode('youtube')
        }
      }
      return () => {
        if (hls) hls.destroy()
        if (video) video.removeAttribute('src')
      }
    }
  }, [channel])

  if (!channel) return null

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      {mode === 'hls' && channel.hls && (
        <video
          ref={videoRef}
          className="w-full h-full bg-black object-contain"
          muted
          controls
        />
      )}
      {mode === 'youtube' && (
        <iframe
          className="w-full h-full bg-black"
          src={`https://www.youtube.com/embed/live_stream?channel=${channel.youtubeChannel}&autoplay=1&mute=1`}
          title={channel.label}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
      <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 pointer-events-none">
        <Radio className="w-3 h-3 text-[var(--color-accent-emerald)]" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-accent-emerald)]">LIVE</span>
      </div>
    </div>
  )
}

const WebcamCard = ({ cam, onClick }) => (
  <button
    className="relative rounded-lg overflow-hidden border border-[var(--color-border-primary)] group text-left"
    onClick={onClick}
  >
    <img
      src={`https://picsum.photos/seed/${cam.seed}/200/110`}
      alt={cam.name}
      loading="lazy"
      className="w-full h-[68px] object-cover group-hover:scale-105 transition-transform"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
    <div className="absolute top-1 left-1 flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-crimson)] animate-pulse" />
      <span className="font-mono text-[8px] text-[var(--color-accent-crimson)]">LIVE</span>
    </div>
    <div className="absolute bottom-1 left-1.5 right-1.5">
      <div className="font-mono text-[9px] text-[var(--color-text-primary)] leading-tight truncate">{cam.name}</div>
      <div className="font-mono text-[8px] text-[var(--color-accent-cyan)] uppercase tracking-wide">{cam.region}</div>
    </div>
  </button>
)

const WebcamViewer = ({ cam, onClose }) => (
  <motion.div
    className="fixed inset-0 z-50 bg-black/85 backdrop-blur flex items-center justify-center p-6 pointer-events-auto"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="panel-glass rounded-lg border border-[var(--color-border-glow)] w-full max-w-4xl overflow-hidden"
      initial={{ scale: 0.95, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-primary)]">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--color-accent-cyan)]" /> {cam.name} <span className="text-[var(--color-accent-crimson)]">● LIVE</span>
        </span>
        <button className="btn-tactical p-1" onClick={onClose} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-2 bg-black" style={{ aspectRatio: '16/9' }}>
        {cam.live === 'youtube' ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${cam.video}?autoplay=1&mute=0`}
            title={cam.name}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : cam.live === 'youtubeChannel' ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/live_stream?channel=${cam.channel}&autoplay=1&mute=0`}
            title={cam.name}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img src={`https://picsum.photos/seed/${cam.seed}/1280/720`} alt={cam.name} className="w-full h-full object-cover" />
        )}
      </div>
    </motion.div>
  </motion.div>
)

const LiveNewsPanel = () => {
  const [channel, setChannel] = useState(NEWS_CHANNELS[0])
  const [region, setRegion] = useState('all')
  const [viewer, setViewer] = useState(null)
  const { sidebars, toggleSidebar } = useUI()

  if (sidebars.events || sidebars.dossier) return null

  const cams = WEBCAM_FEEDS.filter(c => region === 'all' || c.region === region)

  return (
    <motion.div
      className="fixed right-3 top-14 bottom-12 z-20 w-[390px] panel-glass border border-[var(--color-border-primary)] rounded-lg pointer-events-auto flex flex-col overflow-hidden"
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={{ boxShadow: '-6px 0 32px rgba(0,0,0,0.5)' }}
    >
      <div className="p-2 border-b border-[var(--color-border-primary)]"
        style={{ background: 'linear-gradient(135deg, rgba(255,51,85,0.08), transparent)' }}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
            <Video className="w-3.5 h-3.5 text-[var(--color-accent-crimson)]" /> Live News Player
          </span>
          <button className="btn-tactical p-1 text-[9px]" onClick={() => toggleSidebar('events', true)}>
            EVENT FEED <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Channels</span>
            <span className="font-mono text-[9px] text-[var(--color-accent-crimson)]">● LIVE</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {NEWS_CHANNELS.map(ch => (
              <button
                key={ch.id}
                className={`px-2 py-1 rounded font-mono text-[9px] uppercase tracking-wide whitespace-nowrap transition-colors ${channel.id === ch.id ? 'bg-[var(--color-accent-crimson)] text-black font-bold' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                onClick={() => setChannel(ch)}
              >
                {ch.short}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-2 rounded overflow-hidden border border-[var(--color-border-primary)] bg-black flex-shrink-0">
          <NewsPlayer key={channel.id} channel={channel} />
        </div>

        <div className="mt-2 px-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1">
              <Play className="w-3 h-3 text-[var(--color-accent-emerald)]" /> Live Webcams
            </span>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{cams.length} FEEDS</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {WEBCAM_REGIONS.map(r => (
              <button
                key={r.id}
                className={`px-1.5 py-0.5 rounded font-mono text-[8px] uppercase tracking-wide whitespace-nowrap ${region === r.id ? 'bg-[var(--color-accent-emerald)] text-black font-bold' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}
                onClick={() => setRegion(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pt-1 pb-2 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
            {cams.map(cam => (
              <WebcamCard key={cam.id} cam={cam} onClick={() => setViewer(cam)} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {viewer && <WebcamViewer cam={viewer} onClose={() => setViewer(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

export default LiveNewsPanel