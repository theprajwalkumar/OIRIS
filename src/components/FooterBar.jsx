import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Timer, Radio, Database, LayoutGrid, ShieldAlert, Activity, Globe, RadioTower, Signal } from 'lucide-react'
import { useEvents } from '../context/EventContext.jsx'
import { useWS } from '../context/WSContext.jsx'
import { useFeedHealth } from '../hooks/useFeedHealth.js'
import { formatTimestamp, getSeverityColor } from '../utils/helpers.js'
import { EVENT_CATEGORIES } from '../utils/constants.js'

const TOTAL_CATEGORIES = EVENT_CATEGORIES.length
const CAT_LABEL = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.id, c.label]))

const FOOTER_LINKS = [
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'chokepoints', label: 'Chokepoints', icon: Activity },
  { id: 'crises', label: 'Crises', icon: ShieldAlert },
  { id: 'tools', label: 'Tools', icon: LayoutGrid },
  { id: 'status', label: 'Status', icon: Timer },
  { id: 'github', label: 'GitHub', icon: GitBranch }
]

const FooterBar = () => {
  const { stats, filters, getFilteredEvents } = useEvents()
  const { status, messageCount, lastMessage } = useWS()
  const { summary: feedSummary } = useFeedHealth()

  const activeFilterCount =
    filters.severity.length + filters.categories.length + filters.countries.length

  const ticker = useMemo(() => {
    try {
      return [...getFilteredEvents()]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
    } catch {
      return []
    }
  }, [getFilteredEvents, stats])

  const lastLabel = (() => {
    if (!lastMessage) return null
    try {
      const raw = lastMessage.timestamp ?? lastMessage.time ?? lastMessage.ts ?? lastMessage.serverTime ?? Date.now()
      const formatted = formatTimestamp(raw, { relative: true })
      return formatted === 'N/A' ? 'just now' : formatted
    } catch {
      return 'just now'
    }
  })()

  const statusColor = {
    connected: '#00ff88',
    reconnecting: '#ffb800',
    disconnected: '#64748b',
    failed: '#ff3355'
  }[status] || '#64748b'

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 panel-glass border-t border-[var(--color-border-primary)] pointer-events-auto"
      initial={{ y: 60 }}
      animate={{ y: 0 }}
    >
      <div className="accent-line absolute top-0 left-0 right-0 h-px" aria-hidden="true" />
      <div className="max-w-full mx-auto px-4 h-10 flex items-center gap-4">
        <nav className="hidden lg:flex items-center gap-4 flex-shrink-0">
          {FOOTER_LINKS.map(link => {
            const Icon = link.icon
            return (
              <a
                key={link.id}
                href={link.id === 'github' ? 'https://github.com/' : '#'}
                target={link.id === 'github' ? '_blank' : undefined}
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-accent-emerald)] transition-colors"
              >
                <Icon className="w-3 h-3" />
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 flex items-center gap-3 px-2">
          <div className="hidden xl:flex flex-1 min-w-0 items-center overflow-hidden">
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-[var(--color-accent-cyan)] pr-2 mr-2 border-r border-[var(--color-border-primary)] flex-shrink-0">
              <Signal className="w-3 h-3" /> SIG
            </span>
            <div className="flex-1 overflow-hidden">
              {ticker.length === 0 ? (
                <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Awaiting signal…</span>
              ) : (
                <div className="ticker-track">
                  {[...ticker, ...ticker].map((e, i) => (
                    <span key={`${e.id}-${i}`} className="font-mono text-[10px] mx-4 whitespace-nowrap">
                      <span className="text-[var(--color-text-muted)] uppercase">{CAT_LABEL[e.category] || e.category}</span>
                      <span className="mx-1" style={{ color: getSeverityColor(e.severity) }}>·</span>
                      <span className="text-[var(--color-text-secondary)]">{e.title}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <span className="font-mono text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1 flex-shrink-0">
            <Database className="w-3 h-3 text-[var(--color-accent-crimson)]" />
            {stats.total.toLocaleString()} events
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1 flex-shrink-0">
            <Radio className="w-3 h-3 text-[var(--color-accent-cyan)]" />
            {(messageCount / 10).toFixed(0)} msgs
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-secondary)] flex-shrink-0 hidden sm:inline">
            {Object.keys(stats.byCategory).length}/{TOTAL_CATEGORIES} cat
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1 flex-shrink-0">
            <RadioTower className="w-3 h-3" style={{ color: feedSummary.ok === feedSummary.total && feedSummary.total > 0 ? 'var(--color-accent-emerald)' : 'var(--color-accent-amber)' }} />
            {feedSummary.ok}/{feedSummary.total} feeds
          </span>
          {activeFilterCount > 0 && (
            <span className="font-mono text-[10px] text-[var(--color-accent-amber)] flex-shrink-0">FILTERED ({activeFilterCount})</span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {lastLabel && (
            <span className="font-mono text-[10px] text-[var(--color-text-muted)] hidden xl:inline">
              LAST: {lastLabel}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              {status === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: statusColor }} />
              )}
              <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: statusColor }} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: statusColor }}>
              {status}
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default FooterBar
