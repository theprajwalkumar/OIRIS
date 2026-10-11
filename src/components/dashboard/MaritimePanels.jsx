import React, { useMemo } from 'react'
import { Ship, Cable, Zap, Satellite } from 'lucide-react'
import { useEvents } from '../../context/EventContext.jsx'
import {
  buildAisVessels, buildDarkShips, MARITIME_PORTS, CHOKEPOINTS,
  SUBMARINE_CABLES, buildPowerGrid, buildSatellitePasses
} from '../../utils/dashboardData.js'
import { PIPELINES } from '../../utils/constants.js'
import { Panel, DataTable, StatTile, Pill, Dot, Bar, sevColor } from './ui.jsx'

const chColor = (s) => (s === 'critical' ? '#ff3355' : s === 'caution' ? '#ffb800' : '#00ff88')

export const MaritimeAisPanel = () => {
  const vessels = useMemo(() => buildAisVessels(), [])
  const dark = useMemo(() => buildDarkShips(), [])
  const transmitting = vessels.filter((v) => v.status === 'transmitting').length
  const critical = CHOKEPOINTS.filter((c) => c.status === 'critical').length

  const cols = [
    { key: 'name', label: 'Vessel', render: (v) => <span className="text-[var(--color-text-primary)] truncate">{v.name}</span> },
    { key: 'type', label: 'Type', render: (v) => v.type },
    { key: 'flag', label: 'Flag', align: 'right' },
    { key: 'spd', label: 'Spd', align: 'right', render: (v) => `${v.speed}kt` },
    { key: 'st', label: 'Status', align: 'right', render: (v) => <Pill color={v.status === 'dark' ? '#ff3355' : '#00ff88'}>{v.status}</Pill> }
  ]

  return (
    <Panel title="Global Maritime AIS Flow" icon={Ship} accent="var(--color-accent-cyan)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{vessels.length} VESSELS</span>}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <StatTile label="Transmitting" value={transmitting} color="var(--color-accent-emerald)" />
        <StatTile label="Dark Ships" value={dark.length} color="var(--color-accent-crimson)" />
        <StatTile label="Chokepoint Alert" value={critical} color="var(--color-accent-amber)" />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-1.5">
        {CHOKEPOINTS.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <Dot color={chColor(c.status)} size={5} pulse={c.status === 'critical'} />
            <span className="font-mono text-[9px] text-[var(--color-text-secondary)] truncate flex-1">{c.name}</span>
            <span className="font-mono text-[9px]" style={{ color: chColor(c.status) }}>{c.transit}</span>
          </div>
        ))}
      </div>

      <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Ports Activity</div>
      <div className="space-y-0.5 mb-1.5">
        {MARITIME_PORTS.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-text-secondary)] w-20 truncate">{p.name}</span>
            <div className="flex-1"><Bar value={p.activity} color="var(--color-accent-cyan)" height={3} /></div>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8 text-right">{Math.round(p.activity * 100)}%</span>
          </div>
        ))}
      </div>

      <DataTable columns={cols} rows={vessels.slice(0, 12)} rowKey={(v) => v.id} maxHeight="16vh" compact />
    </Panel>
  )
}

export const CablesPipelinesPanel = () => (
  <Panel title="Submarine Cables & Pipelines" icon={Cable} accent="var(--color-accent-amber)">
    <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Submarine Cables</div>
    <div className="space-y-0.5 mb-2">
      {SUBMARINE_CABLES.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <Dot color={c.status === 'degraded' ? '#ffb800' : '#00ff88'} size={5} />
          <span className="font-mono text-[9px] text-[var(--color-text-primary)] flex-1 truncate">{c.name}</span>
          <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{c.capacity}</span>
          <Pill color={c.status === 'degraded' ? '#ffb800' : '#00ff88'}>{c.status}</Pill>
        </div>
      ))}
    </div>

    <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Pipelines</div>
    <div className="space-y-0.5">
      {PIPELINES.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
          <span className="font-mono text-[9px] text-[var(--color-text-secondary)] flex-1 truncate">{p.name}</span>
          <span className="font-mono text-[9px] text-[var(--color-text-muted)]">{p.lengthKm ? `${p.lengthKm}km` : '—'}</span>
        </div>
      ))}
    </div>
  </Panel>
)

export const PowerGridPanel = () => {
  const { events } = useEvents()
  const grid = useMemo(() => buildPowerGrid(), [])
  const outages = useMemo(
    () => Array.from(events.values()).filter((e) => e.category === 'internet-outage'),
    [events]
  )
  return (
    <Panel title="Power Grid & Internet Outages" icon={Zap} accent="var(--color-accent-amber)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{outages.length} OUTAGES</span>}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <StatTile label="Regions" value={grid.length} color="var(--color-accent-cyan)" />
        <StatTile label="Incidents" value={grid.reduce((s, g) => s + g.incidents, 0)} color="var(--color-accent-amber)" />
        <StatTile label="IODA Alerts" value={outages.length} color="var(--color-accent-crimson)" />
      </div>

      <div className="space-y-1 mb-1.5">
        {grid.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-text-secondary)] w-28 truncate">{g.region}</span>
            <div className="flex-1"><Bar value={g.loadPct / 100} color={g.status === 'caution' ? '#ffb800' : '#00ff88'} height={3} /></div>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8 text-right">{g.loadPct}%</span>
          </div>
        ))}
      </div>

      <div className="max-h-[14vh] overflow-auto space-y-0.5">
        {outages.slice(0, 12).map((e) => (
          <div key={e.id} className="flex items-center gap-2 font-mono text-[9px]">
            <Dot color={sevColor(e.severity)} size={5} />
            <span className="text-[var(--color-text-secondary)] truncate flex-1">{e.countryCode || 'GLOBAL'} · {e.details?.impact || e.title}</span>
          </div>
        ))}
        {outages.length === 0 && <div className="font-mono text-[9px] text-[var(--color-text-muted)] text-center py-1">AWAITING IODA…</div>}
      </div>
    </Panel>
  )
}

export const SpacePanel = () => {
  const { events } = useEvents()
  const sats = useMemo(() => buildSatellitePasses(), [])
  const issEvents = useMemo(() => Array.from(events.values()).filter((e) => e.category === 'satellite'), [events])

  const cols = [
    { key: 'name', label: 'Object', render: (s) => <span className="text-[var(--color-text-primary)] truncate">{s.name}</span> },
    { key: 'norad', label: 'NORAD', align: 'right' },
    { key: 'elevation', label: 'El°', align: 'right' },
    { key: 'nextPass', label: 'Next', align: 'right' },
    { key: 'status', label: 'Status', align: 'right', render: (s) => <Pill color={s.status === 'tracking' ? '#00ff88' : '#64748b'}>{s.status}</Pill> }
  ]

  return (
    <Panel title="Space · Satellite Passes & Orbits" icon={Satellite} accent="var(--color-accent-emerald)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{issEvents.length ? 'ISS LIVE' : 'TLE'}</span>}>
      {issEvents[0] && (
        <div className="mb-1.5 px-1.5 py-1 rounded-sm border border-[var(--color-accent-emerald)]/40 bg-[var(--color-accent-emerald)]/5">
          <div className="flex items-center gap-1.5">
            <Dot color="#00ff88" pulse size={6} />
            <span className="font-mono text-[10px] text-[var(--color-accent-emerald)]">{issEvents[0].title}</span>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] ml-auto">
              {(issEvents[0].lat ?? 0).toFixed(2)}, {(issEvents[0].lng ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="font-mono text-[8px] text-[var(--color-text-muted)] mt-0.5">
            ALT {issEvents[0].details?.altitudeKm ?? '—'} km · VEL {issEvents[0].details?.velocityKmh ?? '—'} km/h
          </div>
        </div>
      )}
      <DataTable columns={cols} rows={sats} rowKey={(s) => s.id} maxHeight="22vh" compact />
    </Panel>
  )
}
