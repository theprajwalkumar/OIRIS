import React, { useMemo } from 'react'
import { Gauge, Flame, AlertTriangle } from 'lucide-react'
import { useEvents } from '../../context/EventContext.jsx'
import { buildInstabilityIndex, CONFLICT_ZONES, CRITICAL_ALERTS } from '../../utils/dashboardData.js'
import { Panel, DataTable, Pill, Bar, sevColor, Dot, StatTile } from './ui.jsx'

const duration = (since) => {
  const d = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / 86400000))
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${(d / 365).toFixed(1)}y`
}

const levelColor = (l) => (l === 'critical' ? '#ff3355' : l === 'high' ? '#ffb800' : l === 'elevated' ? '#00d4ff' : '#00ff88')

export const CIIPanel = () => {
  const index = useMemo(() => buildInstabilityIndex(), [])
  const avg = index.reduce((s, r) => s + r.score, 0) / (index.length || 1)
  const level = avg >= 0.7 ? 'critical' : avg >= 0.5 ? 'high' : 'elevated'

  return (
    <Panel
      title="Regional Instability Index (CII)"
      icon={Gauge}
      accent="var(--color-accent-amber)"
      right={<span className="font-mono text-[9px]" style={{ color: levelColor(level) }}>GLOBAL {avg.toFixed(2)}</span>}
    >
      <div className="space-y-1.5">
        {index.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-text-secondary)] w-32 truncate">{r.label}</span>
            <div className="flex-1"><Bar value={r.score} color={levelColor(r.level)} height={4} /></div>
            <span className="font-mono text-[9px] tabular-nums w-8 text-right" style={{ color: levelColor(r.level) }}>{r.score.toFixed(2)}</span>
            <span className="font-mono text-[8px] w-8 text-right" style={{ color: r.delta >= 0 ? '#ff3355' : '#00ff88' }}>
              {r.delta >= 0 ? '▲' : '▼'}{Math.abs(r.delta * 100).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export const ConflictZonesPanel = () => {
  const columns = [
    { key: 'id', label: 'ID', width: 60, render: (r) => <span className="text-[var(--color-text-muted)]">{r.id}</span> },
    { key: 'name', label: 'Region', render: (r) => <span className="text-[var(--color-text-primary)]">{r.name}</span> },
    {
      key: 'severity', label: 'Severity',
      render: (r) => <Pill color={sevColor(r.severity)}>{r.severity}</Pill>
    },
    { key: 'status', label: 'Status', render: (r) => <span>{r.status}</span> },
    { key: 'duration', label: 'Duration', align: 'right', render: (r) => <span className="text-[var(--color-text-secondary)]">{duration(r.since)}</span> }
  ]
  return (
    <Panel title="Conflict Zones (Global)" icon={Flame} accent="var(--color-accent-crimson)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{CONFLICT_ZONES.length} ACTIVE</span>}>
      <DataTable columns={columns} rows={CONFLICT_ZONES} rowKey={(r) => r.id} maxHeight="24vh" />
    </Panel>
  )
}

export const CriticalAlertsPanel = () => {
  const { events } = useEvents()

  const liveAlerts = useMemo(() => {
    const bySev = { critical: 0, high: 0, medium: 0, info: 0 }
    for (const e of events.values()) bySev[e.severity] = (bySev[e.severity] || 0) + 1
    return bySev
  }, [events])

  const segments = [
    { key: 'critical', color: '#ff3355' },
    { key: 'high', color: '#ffb800' },
    { key: 'medium', color: '#00d4ff' },
    { key: 'info', color: '#00ff88' }
  ]
  const total = segments.reduce((s, x) => s + (liveAlerts[x.key] || 0), 0) || 1

  let offset = 0
  const r = 26
  const c = 2 * Math.PI * r

  return (
    <Panel title="Critical Intel Alerts" icon={AlertTriangle} accent="var(--color-accent-crimson)">
      <div className="flex items-center gap-3">
        <svg width="70" height="70" viewBox="0 0 70 70" className="shrink-0">
          <g transform="translate(35,35) rotate(-90)">
            {segments.map((s) => {
              const frac = (liveAlerts[s.key] || 0) / total
              const dash = frac * c
              const el = (
                <circle key={s.key} r={r} fill="none" stroke={s.color} strokeWidth="8"
                  strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} opacity="0.9" />
              )
              offset += dash
              return el
            })}
          </g>
          <text x="35" y="33" textAnchor="middle" className="fill-[var(--color-text-primary)]" style={{ font: '700 13px monospace' }}>{total}</text>
          <text x="35" y="44" textAnchor="middle" className="fill-[var(--color-text-muted)]" style={{ font: '7px monospace' }}>EVENTS</text>
        </svg>
        <div className="flex-1 grid grid-cols-2 gap-1">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <Dot color={s.color} size={6} />
              <span className="font-mono text-[9px] text-[var(--color-text-secondary)] capitalize">{s.key}</span>
              <span className="font-mono text-[9px] ml-auto" style={{ color: s.color }}>{liveAlerts[s.key] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-1 max-h-[18vh] overflow-auto">
        {CRITICAL_ALERTS.map((a) => (
          <div key={a.id} className="flex items-start gap-2 px-1.5 py-1 rounded-sm border border-[var(--color-border-primary)]/60 hover:bg-white/[0.03] transition-colors">
            <Dot color={sevColor(a.level)} size={6} pulse={a.level === 'high'} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] text-[var(--color-text-primary)] leading-tight truncate">{a.title}</div>
              <div className="font-mono text-[8px] text-[var(--color-text-muted)]">{a.region} · {a.source}</div>
            </div>
            <Pill color={sevColor(a.level)}>{a.level}</Pill>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export const IntelStatsStrip = () => {
  const { stats } = useEvents()
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <StatTile label="Total Events" value={stats.total.toLocaleString()} color="var(--color-accent-cyan)" />
      <StatTile label="Critical" value={stats.critical} color="var(--color-accent-crimson)" />
      <StatTile label="High" value={stats.high} color="var(--color-accent-amber)" />
      <StatTile label="Categories" value={Object.keys(stats.byCategory).length} color="var(--color-accent-emerald)" />
    </div>
  )
}
