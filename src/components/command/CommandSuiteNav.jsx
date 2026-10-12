import React from 'react'
import { Share2, Crosshair, Bot, ScrollText } from 'lucide-react'
import { useOntology } from '../../context/OntologyContext.jsx'

const ITEMS = [
  { key: 'explorer', icon: Share2, label: 'OBJECTS', color: 'var(--color-accent-cyan)' },
  { key: 'targeting', icon: Crosshair, label: 'TARGET', color: 'var(--color-accent-crimson)' },
  { key: 'aip', icon: Bot, label: 'AIP', color: 'var(--color-accent-violet)' },
  { key: 'audit', icon: ScrollText, label: 'AUDIT', color: 'var(--color-accent-amber)' }
]

const CommandSuiteNav = () => {
  const { suite, toggleSuite, stats } = useOntology()

  return (
    <nav className="fixed left-0 top-1/2 -translate-y-1/2 z-[1050] flex flex-col gap-1 p-1 panel-glass border border-l-0 border-[var(--color-border-primary)] rounded-r-md">
      <div className="px-1 pb-1 mb-0.5 border-b border-[var(--color-border-primary)] text-center">
        <div className="font-mono text-[7px] uppercase tracking-widest text-[var(--color-text-muted)]">OSDK</div>
        <div className="font-mono text-[9px] text-[var(--color-accent-emerald)] leading-none">{stats.total}</div>
      </div>
      {ITEMS.map(({ key, icon: Icon, label, color }) => {
        const active = suite[key]
        return (
          <button
            key={key}
            onClick={() => toggleSuite(key)}
            title={label}
            className={`relative flex flex-col items-center gap-0.5 w-11 py-1.5 rounded-sm font-mono text-[7px] uppercase tracking-wider transition-colors ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
            style={{ color: active ? color : 'var(--color-text-muted)' }}
          >
            {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />}
            <Icon className="w-4 h-4" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export default CommandSuiteNav
