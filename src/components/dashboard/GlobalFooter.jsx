import React from 'react'
import { Globe, Radio } from 'lucide-react'
import { useEvents } from '../../context/EventContext.jsx'
import { useWS } from '../../context/WSContext.jsx'
import { useFeedHealth } from '../../hooks/useFeedHealth.js'
import { Dot } from './ui.jsx'

const sources = ['USGS', 'NASA EONET', 'GDACS', 'IODA', 'NOAA', 'WhereTheISS.at', 'CISA KEV', 'ThreatFox', 'URLhaus', 'OpenSky', 'adsb.lol']
const YEAR = new Date().getUTCFullYear()

const GlobalFooter = () => {
  const { stats } = useEvents()
  const { status } = useWS()
  const { summary } = useFeedHealth()
  const year = YEAR

  return (
    <footer className="panel-glass border border-[var(--color-border-primary)] rounded-md px-3 py-2 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-primary)]">WORLD MONITOR</span>
        <span className="font-mono text-[9px] text-[var(--color-text-muted)]">© {year}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Dot color={status === 'connected' ? '#00ff88' : '#ffb800'} pulse={status === 'connected'} />
        <span className="font-mono text-[9px] uppercase text-[var(--color-text-muted)]">{status}</span>
      </div>

      <div className="flex items-center gap-2 font-mono text-[9px] text-[var(--color-text-muted)]">
        <span>EVENTS <span className="text-[var(--color-accent-cyan)]">{stats.total.toLocaleString()}</span></span>
        <span>FEEDS <span className="text-[var(--color-accent-emerald)]">{summary.ok}/{summary.total || '—'}</span></span>
        <span>CRIT <span className="text-[var(--color-accent-crimson)]">{stats.critical}</span></span>
      </div>

      <div className="flex items-center gap-1 flex-wrap ml-auto">
        <Radio className="w-3 h-3 text-[var(--color-text-muted)]" />
        {sources.map((s) => (
          <span key={s} className="font-mono text-[8px] px-1 py-0.5 rounded-sm border border-[var(--color-border-primary)] text-[var(--color-text-muted)]">{s}</span>
        ))}
      </div>
    </footer>
  )
}

export default GlobalFooter
