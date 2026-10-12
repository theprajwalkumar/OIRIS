import React, { useEffect, useState } from 'react'
import { LineChart, TrendingUp, TrendingDown } from 'lucide-react'
import { getMarkets } from '../../services/markets.js'
import { Panel, Dot } from './ui.jsx'

const UP = '#00ff88'
const DOWN = '#ff3355'
const FLAT = '#64748b'

const Sparkline = ({ data, color, width = 60, height = 16 }) => {
  if (!Array.isArray(data) || data.length < 2) return <div style={{ width, height }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 2) - 1).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

const QuoteRow = ({ q }) => {
  const dir = q.changePct == null ? FLAT : q.changePct > 0 ? UP : q.changePct < 0 ? DOWN : FLAT
  const dp = q.price != null && q.price < 10 ? 4 : 2
  return (
    <div className="flex items-center gap-2 py-1 border-b border-[var(--color-border-primary)]/40 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] text-[var(--color-text-primary)] truncate">{q.name}</div>
        <div className="font-mono text-[8px] text-[var(--color-text-muted)] truncate">{q.symbol}</div>
      </div>
      <Sparkline data={q.spark} color={dir} />
      <div className="text-right shrink-0" style={{ minWidth: 62 }}>
        <div className="font-mono text-[11px] text-[var(--color-text-primary)]">
          {q.price != null ? q.price.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—'}
        </div>
        <div className="font-mono text-[9px]" style={{ color: dir }}>
          {q.changePct == null ? '—' : `${q.changePct > 0 ? '+' : ''}${q.changePct.toFixed(2)}%`}
        </div>
      </div>
    </div>
  )
}

const MarketsPanel = () => {
  const [state, setState] = useState({ groups: [], loading: true, error: null, ts: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getMarkets()
        if (cancelled) return
        if (Array.isArray(data.groups) && data.groups.length) {
          setState({ groups: data.groups, loading: false, error: null, ts: data.timestamp })
        } else {
          setState((s) => ({ ...s, loading: false, error: data.error || 'no data' }))
        }
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }))
      }
    }
    load()
    const id = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const count = state.groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <Panel
      title="Markets · India & Global"
      icon={LineChart}
      accent="var(--color-accent-emerald)"
      right={
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{count} INSTRUMENTS</span>
          <Dot color={state.error ? '#ff3355' : '#00ff88'} pulse={state.loading} />
        </div>
      }
    >
      {state.error && count === 0 ? (
        <div className="py-6 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
          Markets unavailable · {state.error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1">
          {state.groups.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-1.5 mb-1">
                {group.id === 'india-indices' && <TrendingUp className="w-3 h-3 text-[var(--color-accent-emerald)]" />}
                {group.id === 'india-equities' && <TrendingDown className="w-3 h-3 text-[var(--color-accent-amber)]" />}
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">{group.label}</span>
              </div>
              <div className="rounded border border-[var(--color-border-primary)]/60 px-2 py-0.5 bg-black/20">
                {group.items.map((q) => <QuoteRow key={q.symbol} q={q} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export default MarketsPanel
