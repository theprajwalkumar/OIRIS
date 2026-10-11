import React, { useMemo, useState } from 'react'
import { Camera, Activity, Rss, Newspaper } from 'lucide-react'
import { useFeedHealth } from '../../hooks/useFeedHealth.js'
import { useEvents } from '../../context/EventContext.jsx'
import { WEBCAM_FEEDS, WEBCAM_REGIONS } from '../../utils/constants.js'
import { buildFeedCoverage, buildNewsHeadlines } from '../../utils/dashboardData.js'
import { Panel, StatTile, Dot, Bar, sevColor, timeAgo } from './ui.jsx'

export const WebcamsPanel = () => {
  const [region, setRegion] = useState('all')
  const cams = WEBCAM_FEEDS.filter((c) => region === 'all' || c.region === region)

  const src = (cam) =>
    cam.channel
      ? `https://www.youtube.com/embed/live_stream?channel=${cam.channel}&autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3`
      : `https://www.youtube.com/embed/${cam.video}?autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3`

  return (
    <Panel
      title="Live Webcams"
      icon={Camera}
      accent="var(--color-accent-cyan)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{cams.length} NODES</span>}
    >
      <div className="flex items-center gap-0.5 mb-1.5 flex-wrap">
        {WEBCAM_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegion(r.id)}
            className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] tracking-wider transition-colors ${region === r.id ? 'bg-[var(--color-accent-cyan)] text-black font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {cams.map((cam) => (
          <div key={cam.id} className="relative rounded border border-[var(--color-border-primary)] overflow-hidden group">
            <div className="relative aspect-video bg-black overflow-hidden">
              <iframe
                title={cam.name}
                className="absolute inset-0 w-full h-full"
                src={src(cam)}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
              />
              <div className="absolute top-1 left-1 flex items-center gap-1 px-1 rounded-sm bg-black/60 pointer-events-none">
                <Dot color="#ff3355" pulse size={5} />
                <span className="font-mono text-[8px] text-white/90 tracking-wider">LIVE</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-1 px-1.5 py-0.5 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                <span className="font-mono text-[9px] text-white/95 truncate">{cam.name}</span>
                <span className="font-mono text-[8px] text-[var(--color-accent-cyan)] shrink-0">{cam.country}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export const FeedCoveragePanel = () => {
  const { summary, feeds } = useFeedHealth()
  const { stats } = useEvents()
  const coverage = useMemo(() => buildFeedCoverage(), [])

  const catEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const maxCat = catEntries[0]?.[1] || 1

  const feedList = Object.entries(feeds).slice(0, 8)

  return (
    <Panel title="Feed Coverage Metrics" icon={Rss} accent="var(--color-accent-emerald)">
      <div className="grid grid-cols-3 gap-1.5">
        <StatTile label="Publishers" value={coverage.publishers} color="var(--color-accent-cyan)" />
        <StatTile label="Items" value={stats.total.toLocaleString()} color="var(--color-accent-emerald)" />
        <StatTile label="Completed" value={coverage.completed} color="var(--color-accent-violet)" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        <StatTile label="Categories" value={coverage.categories} color="var(--color-accent-amber)" />
        <StatTile label="Feed Status" value={`${summary.ok}/${summary.total || coverage.statusTotal}`} color="var(--color-accent-emerald)" />
        <StatTile label="Ticker" value={`${coverage.tickerSpeed} wpm`} color="var(--color-accent-cyan)" />
      </div>

      <div className="mt-2 space-y-1">
        <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-text-muted)]">Category Stats</div>
        {catEntries.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-text-secondary)] w-24 truncate">{cat}</span>
            <div className="flex-1"><Bar value={count / maxCat} color="var(--color-accent-cyan)" height={3} /></div>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8 text-right">{count}</span>
          </div>
        ))}
      </div>

      {feedList.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
          {feedList.map(([name, f]) => (
            <div key={name} className="flex items-center gap-1.5">
              <Dot color={f.color} size={5} />
              <span className="font-mono text-[8px] text-[var(--color-text-secondary)] truncate">{name}</span>
              <span className="font-mono text-[8px] ml-auto" style={{ color: f.color }}>{f.recordCount ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export const BreakingTicker = () => {
  const { events } = useEvents()
  const staticHeads = useMemo(() => buildNewsHeadlines(), [])

  const liveHeads = useMemo(() => {
    return Array.from(events.values())
      .filter((e) => e.severity === 'critical' || e.severity === 'high')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map((e) => ({ sev: e.severity, src: e.source, cc: e.countryCode, text: e.title, ts: e.timestamp }))
  }, [events])

  const items = [...liveHeads, ...staticHeads]
  const doubled = [...items, ...items]

  return (
    <div className="panel-glass border border-[var(--color-border-primary)] rounded-md overflow-hidden">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--color-accent-crimson)]/15 border-r border-[var(--color-border-primary)] shrink-0">
          <Newspaper className="w-3.5 h-3.5 text-[var(--color-accent-crimson)]" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--color-accent-crimson)]">Breaking</span>
          <Dot color="#ff3355" pulse size={5} />
        </div>
        <div className="relative flex-1 overflow-hidden py-1.5">
          <div className="ticker-track whitespace-nowrap">
            {doubled.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-2 mx-4">
                <span className="font-mono text-[9px] px-1 rounded-sm" style={{ color: sevColor(h.sev), background: `${sevColor(h.sev)}1a` }}>{h.sev.toUpperCase()}</span>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)]">[{h.src}]</span>
                <span className="font-mono text-[10px] text-[var(--color-text-primary)]">{h.text}</span>
                {h.ts && <span className="font-mono text-[8px] text-[var(--color-text-muted)]">{timeAgo(h.ts)}</span>}
                <span className="text-[var(--color-accent-cyan)]">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const GlobalSituationHeader = () => {
  const [now, setNow] = useState(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const full = now.toLocaleString('en-GB', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const time = now.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })

  return (
    <div className="flex items-center justify-between px-3 py-2 panel-glass border border-[var(--color-border-primary)] rounded-md">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-[var(--color-accent-crimson)]" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-text-primary)]">Global Situation</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">{full}</span>
        <span className="font-mono text-sm tabular-nums text-[var(--color-accent-cyan)] glow-cyan">{time}</span>
        <span className="font-mono text-[9px] text-[var(--color-text-muted)]">UTC</span>
      </div>
    </div>
  )
}
