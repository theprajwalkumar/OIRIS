import React, { useMemo } from 'react'
import { Activity, Flame } from 'lucide-react'
import { useEvents } from '../../context/EventContext.jsx'
import { Panel, DataTable, StatTile, Pill, sevColor, timeAgo } from './ui.jsx'

const magColor = (m) => (m >= 7 ? '#ff3355' : m >= 5.5 ? '#ffb800' : m >= 4 ? '#00d4ff' : '#00ff88')

export const EarthquakesPanel = () => {
  const { events } = useEvents()
  const quakes = useMemo(
    () => Array.from(events.values())
      .filter((e) => e.category === 'earthquake')
      .sort((a, b) => (b.details?.magnitude || 0) - (a.details?.magnitude || 0)),
    [events]
  )
  const maxMag = quakes[0]?.details?.magnitude || 0
  const significant = quakes.filter((q) => (q.details?.magnitude || 0) >= 5).length

  const cols = [
    { key: 'mag', label: 'Mag', width: 40, render: (q) => <span style={{ color: magColor(q.details?.magnitude || 0) }}>M{(q.details?.magnitude || 0).toFixed(1)}</span> },
    { key: 'place', label: 'Location', render: (q) => <span className="text-[var(--color-text-primary)] truncate">{q.details?.location || q.title}</span> },
    { key: 'depth', label: 'Depth', align: 'right', render: (q) => `${q.details?.depth ?? '—'}km` },
    { key: 'age', label: 'Time', align: 'right', render: (q) => timeAgo(q.timestamp) }
  ]

  return (
    <Panel title="Natural Disasters · Earthquakes" icon={Activity} accent="var(--color-accent-amber)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{quakes.length} USGS</span>}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <StatTile label="Events" value={quakes.length} color="var(--color-accent-cyan)" />
        <StatTile label="Max Mag" value={maxMag ? `M${maxMag.toFixed(1)}` : '—'} color={magColor(maxMag)} />
        <StatTile label="M≥5.0" value={significant} color="var(--color-accent-amber)" />
      </div>
      <DataTable columns={cols} rows={quakes.slice(0, 40)} rowKey={(q) => q.id} maxHeight="24vh" compact empty="AWAITING USGS…" />
    </Panel>
  )
}

const NATURAL_LABELS = ['wildfire', 'flood', 'drought', 'dust', 'ice', 'landslide', 'volcano']

export const WildfiresWeatherPanel = () => {
  const { events } = useEvents()
  const natural = useMemo(
    () => Array.from(events.values())
      .filter((e) => NATURAL_LABELS.includes(e.category))
      .sort((a, b) => b.timestamp - a.timestamp),
    [events]
  )
  const weather = useMemo(() => Array.from(events.values()).filter((e) => e.category === 'aviation-weather'), [events])
  const disasters = useMemo(() => Array.from(events.values()).filter((e) => e.category === 'disaster'), [events])

  const byCat = useMemo(() => {
    const m = {}
    natural.forEach((e) => { m[e.category] = (m[e.category] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [natural])

  return (
    <Panel title="Wildfires & Weather Anomalies" icon={Flame} accent="var(--color-accent-crimson)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{natural.length + weather.length + disasters.length} ALERTS</span>}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <StatTile label="Natural Events" value={natural.length} color="var(--color-accent-crimson)" />
        <StatTile label="Disaster Alerts" value={disasters.length} color="var(--color-accent-amber)" />
        <StatTile label="Adverse WX" value={weather.length} color="var(--color-accent-cyan)" />
      </div>

      <div className="flex flex-wrap gap-1 mb-1.5">
        {byCat.map(([cat, n]) => (
          <Pill key={cat} color={cat === 'wildfire' ? '#ff3355' : cat === 'flood' ? '#00d4ff' : '#ffb800'}>{cat} {n}</Pill>
        ))}
      </div>

      <div className="max-h-[20vh] overflow-auto space-y-0.5">
        {[...natural, ...disasters].slice(0, 24).map((e) => (
          <div key={e.id} className="flex items-center gap-2 font-mono text-[9px]">
            <Pill color={sevColor(e.severity)}>{e.category}</Pill>
            <span className="text-[var(--color-text-secondary)] truncate flex-1">{e.title}</span>
            <span className="text-[var(--color-text-muted)]">{timeAgo(e.timestamp)}</span>
          </div>
        ))}
        {natural.length + disasters.length === 0 && <div className="font-mono text-[9px] text-[var(--color-text-muted)] text-center py-2">AWAITING EONET / GDACS…</div>}
      </div>
    </Panel>
  )
}
