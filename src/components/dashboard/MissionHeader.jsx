import React, { useEffect, useState } from 'react'
import { Zap, Radio, Search, Boxes, Clock, Activity } from 'lucide-react'
import { useUI } from '../../context/UIContext.jsx'
import { useMapLayers } from '../../context/MapLayerContext.jsx'
import { useWS } from '../../context/WSContext.jsx'
import { useEvents } from '../../context/EventContext.jsx'
import { DEFCON_LEVELS, TIME_RANGES } from '../../utils/constants.js'
import { Dot } from './ui.jsx'

const utcClock = () =>
  new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })

const MissionHeader = ({ defcon = 5, onOpenSearch }) => {
  const [clock, setClock] = useState(utcClock())
  const [rangeId, setRangeId] = useState('24h')
  const { mapMode, toggleMapMode } = useUI()
  const { setTimeRange } = useMapLayers()
  const { status } = useWS()
  const { stats } = useEvents()

  useEffect(() => {
    const id = setInterval(() => setClock(utcClock()), 1000)
    return () => clearInterval(id)
  }, [])

  const dc = DEFCON_LEVELS[defcon] || DEFCON_LEVELS[5]
  const activeRange = rangeId

  const statusColor = status === 'connected' ? '#00ff88' : status === 'reconnecting' ? '#ffb800' : '#ff3355'

  return (
    <header className="panel-glass border-b border-[var(--color-border-primary)] px-3 py-2 flex items-center gap-3 flex-wrap shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded border border-[var(--color-accent-emerald)] flex items-center justify-center"
          style={{ boxShadow: '0 0 16px rgba(0,255,136,0.2), inset 0 0 12px rgba(0,255,136,0.1)' }}>
          <Zap className="w-4 h-4 text-[var(--color-accent-emerald)]" />
        </div>
        <div className="leading-tight">
          <div className="font-mono text-xs font-bold tracking-[0.25em] text-[var(--color-text-primary)]">WORLD MONITOR</div>
          <div className="font-mono text-[8px] tracking-[0.3em] text-[var(--color-text-muted)]">MISSION CONTROL</div>
          <div className="font-mono text-[8px] tracking-wide text-[var(--color-text-muted)]">Developed by Prajwal with <span className="text-[var(--color-accent-crimson)]">♥</span></div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 py-1 rounded border border-[var(--color-border-primary)]">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">DEFCON</span>
        <span className="font-mono text-base font-bold leading-none" style={{ color: dc.color, textShadow: `0 0 10px ${dc.color}88` }}>{dc.level}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: dc.color }}>{dc.label}</span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#ff8a3a55] bg-[#ff8a3a12]">
        <Activity className="w-3.5 h-3.5 text-[#ff8a3a]" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#ff8a3a]">MISSION STATUS</span>
        <span className="font-mono text-[10px] font-bold text-[#ff8a3a]">ELEVATED WATCH</span>
      </div>

      <div className="flex items-center gap-0.5 rounded border border-[var(--color-border-primary)] p-0.5">
        <Clock className="w-3 h-3 ml-1 mr-0.5 text-[var(--color-text-muted)]" />
        {TIME_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setRangeId(r.id)
              setTimeRange({ start: r.ms === Infinity ? 0 : Date.now() - r.ms, end: Date.now() })
            }}
            className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] transition-colors ${activeRange === r.id ? 'bg-[var(--color-accent-cyan)] text-black font-bold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border-primary)]">
          <Dot color={statusColor} pulse={status === 'connected'} />
          <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: statusColor }}>{status}</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border-primary)]">
          <Radio className="w-3 h-3 text-[var(--color-accent-crimson)]" />
          <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">{stats.total.toLocaleString()}</span>
          <span className="font-mono text-[9px] text-[var(--color-text-muted)]">EVENTS</span>
        </div>
        <button
          onClick={toggleMapMode}
          className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-border-primary)] font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)] transition-colors"
        >
          <Boxes className="w-3 h-3" /> {mapMode}
        </button>
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-border-primary)] font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-secondary)] hover:text-[var(--color-accent-emerald)] hover:border-[var(--color-accent-emerald)] transition-colors"
        >
          <Search className="w-3 h-3" /> SEARCH
        </button>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-accent-cyan)]/40 bg-[var(--color-accent-cyan)]/5">
          <Clock className="w-3 h-3 text-[var(--color-accent-cyan)]" />
          <span className="font-mono text-[11px] tabular-nums text-[var(--color-accent-cyan)]">{clock}</span>
          <span className="font-mono text-[8px] text-[var(--color-text-muted)]">UTC</span>
        </div>
      </div>
    </header>
  )
}

export default MissionHeader
