import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, ShieldCheck, Search, Box, Boxes, Bell, BellOff, ChevronDown, Radio, Maximize2, Minimize2 } from 'lucide-react'
import { useUI } from '../context/UIContext.jsx'
import { useWS } from '../context/WSContext.jsx'
import { useEvents } from '../context/EventContext.jsx'
import { DEFCON_LEVELS, TIME_RANGES } from '../utils/constants.js'

const UTC_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const UTC_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const pad = (n) => String(n).padStart(2, '0')

const DefconBadge = () => {
  const [index, setIndex] = useState(0)
  const defcon = DEFCON_LEVELS[5 - (index % 5)] || DEFCON_LEVELS[5]
  return (
    <button
      className="flex items-center gap-1.5 px-2 py-1 rounded border"
      style={{
        borderColor: `${defcon.color}44`,
        background: `${defcon.color}0d`,
        boxShadow: `inset 0 0 12px ${defcon.color}11`
      }}
      onClick={() => setIndex(i => i + 1)}
      title="Click to cycle DEFCON level"
    >
      <ShieldCheck className="w-3.5 h-3.5" style={{ color: defcon.color }} />
      <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: defcon.color }}>
        DEFCON {defcon.level}
      </span>
    </button>
  )
}

const TimeRangeSelect = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)]"
        onClick={() => setOpen(!open)}
        title="Time range"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider">{selected}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-1 panel-glass border border-[var(--color-border-primary)] rounded-md overflow-hidden z-50"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {TIME_RANGES.map(r => (
              <button
                key={r.id}
                className="w-full px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: selected === r.id ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)' }}
                onClick={() => { onChange(r); setOpen(false) }}
              >
                {r.label} {selected === r.id ? '●' : ''}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const UtcClock = () => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const text = `${UTC_DAYS[now.getUTCDay()]}, ${pad(now.getUTCDate())} ${UTC_MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`
  return <span className="font-mono text-[10px] text-[var(--color-text-secondary)] tabular-nums">{text}</span>
}

const TopBar = ({ onOpenSearch }) => {
  const { isFullscreen, toggleFullscreen, notifications, mapMode, toggleMapMode } = useUI()
  const { status, messageCount } = useWS()
  const { setFilter } = useEvents()
  const [timeRange, setTimeRange] = useState('all')
  const [showNotifs, setShowNotifs] = useState(false)

  const statusColor = {
    connected: '#00ff88',
    reconnecting: '#ffb800',
    disconnected: '#64748b',
    failed: '#ff3355'
  }[status] || '#64748b'

  const statusLabel = {
    connected: 'LIVE GLOBAL',
    reconnecting: 'RECONNECTING',
    disconnected: 'DISCONNECTED',
    failed: 'CONNECTION FAILED'
  }[status] || 'UNKNOWN'

  const onTimeRangeChange = (range) => {
    setTimeRange(range.id)
    setFilter('dateRange', range.ms === Infinity ? null : [Date.now() - range.ms, Date.now()])
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-40 panel-glass border-b border-[var(--color-border-primary)] pointer-events-auto"
      initial={{ y: -60 }}
      animate={{ y: 0 }}
    >
      <div className="accent-line absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
      <div className="max-w-full mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-accent-emerald)]" style={{ filter: 'drop-shadow(0 0 6px var(--color-accent-emerald))' }} />
            <span className="font-mono text-sm font-bold tracking-wider text-[var(--color-text-primary)] whitespace-nowrap">
              WORLD&nbsp;MONITOR
            </span>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] whitespace-nowrap">v2.10.0</span>
          </div>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--color-accent-emerald)]" style={{ background: 'rgba(0,255,136,0.06)' }}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: statusColor }} />
              <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: statusColor }} />
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: statusColor }}>{statusLabel}</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <DefconBadge />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] px-2 py-1 rounded border border-[var(--color-border-primary)] whitespace-nowrap">
            MISSION: <span className="text-[var(--color-accent-cyan)]">SATCOM // INTEL</span>
          </span>
          <TimeRangeSelect selected={timeRange} onChange={onTimeRangeChange} />
          <button
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)]"
            onClick={toggleMapMode}
            title={mapMode === '2D' ? 'Switch to 3D terrain view' : 'Switch to 2D view'}
          >
            {mapMode === '2D' ? <Box className="w-3.5 h-3.5" /> : <Boxes className="w-3.5 h-3.5" />}
            <span className="font-mono text-[10px] uppercase tracking-wider">{mapMode}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded border border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] transition-colors"
            onClick={onOpenSearch}
            title="Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider hidden lg:inline">Search</span>
            <kbd className="font-mono text-[9px] px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]">⌘K</kbd>
          </button>

          <div className="relative">
            <button
              className="btn-tactical p-1.5"
              onClick={() => setShowNotifs(!showNotifs)}
              title="Notifications"
            >
              {showNotifs ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent-crimson)] text-black font-mono text-[9px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  className="absolute right-0 top-full mt-2 w-72 panel-glass border border-[var(--color-border-primary)] rounded-md overflow-hidden z-50"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="px-3 py-2 border-b border-[var(--color-border-primary)] font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                    Notifications
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-center font-mono text-[10px] text-[var(--color-text-muted)]">NO NEW SIGNALS</div>
                    ) : notifications.slice(0, 12).map(n => (
                      <div key={n.id} className="px-3 py-2 border-b border-[var(--color-border-primary)]/50 last:border-b-0">
                        <div className="font-mono text-[11px] text-[var(--color-text-primary)]">{n.title}</div>
                        <div className="font-mono text-[9px] text-[var(--color-text-muted)] mt-0.5">{n.message}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            className="btn-tactical p-1.5"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-[var(--color-border-primary)]">
            <Radio className="w-3.5 h-3.5 text-[var(--color-accent-emerald)]" />
            <UtcClock />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default TopBar