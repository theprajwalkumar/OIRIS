import React, { useMemo } from 'react'
import { useEvents } from '../../context/EventContext.jsx'
import { buildInstabilityIndex, CONFLICT_ZONES, CRITICAL_ALERTS, buildFeedCoverage } from '../../utils/dashboardData.js'
import { Surface, Chip } from './Section.jsx'

const LEVEL_TONE = { critical: 'coral', high: 'amber', elevated: 'ice', stable: 'mute', medium: 'ice', low: 'mute', info: 'mute' }
const tone = (s) => LEVEL_TONE[s] || 'mute'
const scoreTone = (l) => (l === 'critical' ? 'coral' : l === 'high' ? 'amber' : l === 'elevated' ? 'ice' : 'mute')

const duration = (since) => {
  const d = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / 86400000))
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${(d / 365).toFixed(1)}y`
}

const Bar = ({ value, tone: t = 'ice' }) => {
  const colors = { coral: 'var(--color-coral)', amber: 'var(--color-amber)', ice: 'var(--color-ice)', mute: 'var(--color-faint)' }
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-line)]" role="presentation">
      <div className="h-full rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: colors[t] }} />
    </div>
  )
}

const Stat = ({ label, value, note }) => (
  <div className="border-t border-[var(--color-line)] pt-3 first:border-0 first:pt-0 lg:border-0 lg:pt-0">
    <div className="font-serif text-[38px] leading-none text-[var(--color-bone)]">{value}</div>
    <div className="mt-1 text-xs text-[var(--color-mute)]">{label}</div>
    {note && <div className="text-[11px] text-[var(--color-faint)]">{note}</div>}
  </div>
)

const InstabilitySection = () => {
  const { stats } = useEvents()
  const index = useMemo(() => buildInstabilityIndex(), [])
  const coverage = useMemo(() => buildFeedCoverage(), [])

  const avg = index.reduce((s, r) => s + r.score, 0) / (index.length || 1)
  const level = avg >= 0.8 ? 'critical' : avg >= 0.6 ? 'high' : avg >= 0.4 ? 'elevated' : 'stable'
  const categories = Object.keys(stats.byCategory || {}).length
  const topCountry = useMemo(() => {
    const entries = Object.entries(stats.byCountry || {})
    if (!entries.length) return null
    entries.sort((a, b) => b[1] - a[1])
    return { code: entries[0][0], count: entries[0][1] }
  }, [stats.byCountry])

  return (
    <div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Events tracked" value={stats.total.toLocaleString()} note="live feeds" />
        <Stat label="Critical" value={stats.critical} note={`${stats.high} high`} />
        <Stat label="Categories" value={categories} note="active event types" />
        <Stat
          label="Instability average"
          value={avg.toFixed(2)}
          note={topCountry ? `highest activity ${topCountry.code} · ${topCountry.count}` : 'modelled baseline'}
        />
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[var(--color-mute)]">
        Instability is {level} across the tracked regions, averaging {avg.toFixed(2)} on the regional index.
        There {stats.critical === 1 ? 'is' : 'are'} {stats.critical} critical and {stats.high} high-severity
        {' '}events in the current window{topCountry ? `, with the most activity attributed to ${topCountry.code}` : ''}.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Surface title="Regional instability" right={<Chip tone={scoreTone(level)}>{level}</Chip>}>
          <ul className="space-y-2.5">
            {index.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-[13px] text-[var(--color-bone)]">{r.label}</span>
                <span className="flex-1"><Bar value={r.score} tone={scoreTone(r.level)} /></span>
                <span className="w-9 text-right text-xs text-[var(--color-mute)]">{r.score.toFixed(2)}</span>
                <span className={`w-10 text-right text-[11px] ${r.delta >= 0 ? 'text-[var(--color-coral)]' : 'text-[var(--color-ice)]'}`}>
                  {r.delta >= 0 ? '▲' : '▼'}{Math.abs(r.delta * 100).toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--color-faint)]">Modelled baseline with 24h delta · not live telemetry.</p>
        </Surface>

        <Surface title="Conflict zones" right={<span className="text-[11px] text-[var(--color-faint)]">{CONFLICT_ZONES.length} active</span>}>
          <ul className="divide-y divide-[var(--color-line)]">
            {CONFLICT_ZONES.map((z) => (
              <li key={z.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-[var(--color-bone)]">{z.name}</span>
                  <span className="block text-[11px] text-[var(--color-faint)]">{z.region} · {z.status}</span>
                </span>
                <Chip tone={tone(z.severity)}>{z.severity}</Chip>
                <span className="w-9 text-right text-[11px] text-[var(--color-mute)]">{duration(z.since)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--color-faint)]">Reference conflict register · static.</p>
        </Surface>

        <Surface title="Feed coverage and alerts">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {[
              ['Publishers', coverage.publishers],
              ['Items', coverage.items.toLocaleString()],
              ['Completed', coverage.completed],
              ['Categories', coverage.categories],
              ['Feeds healthy', `${coverage.statusHealthy}/${coverage.statusTotal}`]
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-[var(--color-line)] pb-1.5">
                <span className="text-[var(--color-mute)]">{k}</span>
                <span className="text-[var(--color-bone)]">{v}</span>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5">
            {CRITICAL_ALERTS.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <Chip tone={tone(a.level)}>{a.level}</Chip>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] leading-snug text-[var(--color-bone)]">{a.title}</span>
                  <span className="block text-[11px] text-[var(--color-faint)]">{a.region} · {a.source}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[var(--color-faint)]">Coverage figures are modelled; alerts are reference.</p>
        </Surface>
      </div>
    </div>
  )
}

export default InstabilitySection