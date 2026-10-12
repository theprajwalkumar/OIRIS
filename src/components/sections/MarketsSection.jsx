import React, { useEffect, useRef, useState } from 'react'
import { getMarkets } from '../../services/markets.js'
import { Surface, Chip } from './Section.jsx'

const UP = 'var(--color-brass)'
const DOWN = 'var(--color-coral)'
const FLAT = 'var(--color-mute)'

const colorFor = (changePct) => (changePct == null || changePct === 0 ? FLAT : changePct > 0 ? UP : DOWN)

const Sparkline = ({ data, color }) => {
  if (!Array.isArray(data) || data.length < 2) return <span className="inline-block h-4 w-16" />
  const w = 64
  const h = 16
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

const QuoteRow = ({ q, flash }) => {
  const color = colorFor(q.changePct)
  const dp = q.price != null && q.price < 10 ? 4 : 2
  return (
    <tr
      className="border-b border-[var(--color-line)] last:border-0 transition-colors duration-500"
      style={flash ? { backgroundColor: 'rgba(201,165,94,0.08)' } : undefined}
    >
      <td className="py-1.5 pr-3">
        <span className="block truncate text-[13px] text-[var(--color-bone)]">{q.name}</span>
      </td>
      <td className="py-1.5 pr-3 text-[11px] text-[var(--color-faint)]">{q.symbol}</td>
      <td className="hidden py-1.5 pr-3 sm:table-cell">
        <span style={{ color }}><Sparkline data={q.spark} color={color} /></span>
      </td>
      <td className="py-1.5 pr-3 text-right text-[13px] text-[var(--color-bone)]">
        {q.price != null ? q.price.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—'}
      </td>
      <td className="py-1.5 text-right text-[13px]" style={{ color }}>
        {q.changePct == null ? '—' : `${q.changePct > 0 ? '+' : ''}${q.changePct.toFixed(2)}%`}
      </td>
    </tr>
  )
}

const Region = ({ title, groups, flashes }) => (
  <Surface title={title} right={<span className="text-[11px] text-[var(--color-faint)]">{groups.reduce((n, g) => n + g.items.length, 0)} instruments</span>}>
    {groups.map((g) => (
      <div key={g.id} className="mb-3 last:mb-0">
        <div className="mb-1 text-[11px] text-[var(--color-faint)]">{g.label}</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-[var(--color-faint)]">
              <th className="pb-1 font-normal">Instrument</th>
              <th className="pb-1 font-normal">Symbol</th>
              <th className="hidden pb-1 font-normal sm:table-cell">24h</th>
              <th className="pb-1 text-right font-normal">Last</th>
              <th className="pb-1 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {g.items.map((q) => <QuoteRow key={q.symbol} q={q} flash={flashes.has(q.symbol)} />)}
          </tbody>
        </table>
      </div>
    ))}
  </Surface>
)

const MarketsSection = () => {
  const [state, setState] = useState({ groups: [], loading: true, error: null })
  const [flashes, setFlashes] = useState(() => new Set())
  const prevPrices = useRef(new Map())
  const flashTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getMarkets()
        if (cancelled) return
        if (Array.isArray(data.groups) && data.groups.length) {
          const changed = new Set()
          for (const g of data.groups) {
            for (const q of g.items) {
              const prev = prevPrices.current.get(q.symbol)
              if (prev != null && q.price != null && prev !== q.price) changed.add(q.symbol)
              if (q.price != null) prevPrices.current.set(q.symbol, q.price)
            }
          }
          setState({ groups: data.groups, loading: false, error: null })
          if (changed.size) {
            setFlashes(changed)
            clearTimeout(flashTimer.current)
            flashTimer.current = setTimeout(() => setFlashes(new Set()), 900)
          }
        } else {
          setState((s) => ({ ...s, loading: false, error: data.error || 'no data' }))
        }
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }))
      }
    }
    load()
    const id = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(id); clearTimeout(flashTimer.current) }
  }, [])

  const india = state.groups.filter((g) => g.id === 'india-indices' || g.id === 'india-equities')
  const world = state.groups.filter((g) => g.id !== 'india-indices' && g.id !== 'india-equities')
  const count = state.groups.reduce((n, g) => n + g.items.length, 0)

  if (state.error && count === 0) {
    return (
      <Surface>
        <p className="py-6 text-center text-sm text-[var(--color-mute)]">Markets unavailable · {state.error}</p>
      </Surface>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-[var(--color-faint)]">
        <Chip tone={state.loading ? 'ice' : 'brass'}>{state.loading ? 'syncing' : 'live'}</Chip>
        <span>{count} instruments · 15s refresh · up brass, down coral</span>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Region title="India" groups={india} flashes={flashes} />
        <Region title="World" groups={world} flashes={flashes} />
      </div>
    </div>
  )
}

export default MarketsSection