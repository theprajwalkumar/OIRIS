import React, { useMemo, useState } from 'react'
import { Shield, Bug, Network, Link2 } from 'lucide-react'
import { useEvents } from '../../context/EventContext.jsx'
import { buildAttackFlows, buildBotnets, CYBER_ATTACK } from '../../utils/dashboardData.js'
import { Panel, DataTable, Pill, Bar, StatTile, Dot, sevColor, timeAgo } from './ui.jsx'

const W = 360
const H = 180
const project = (lat, lng) => [((lng + 180) / 360) * W, ((90 - lat) / 180) * H]

export const CyberAttackMapPanel = () => {
  const flows = useMemo(() => buildAttackFlows(), [])
  const total = flows.reduce((s, f) => s + f.intensity, 0)

  return (
    <Panel title="Live Cyber Attack Map" icon={Network} accent="var(--color-accent-crimson)"
      right={<span className="font-mono text-[9px] text-[var(--color-accent-crimson)]">{flows.length} FLOWS</span>}>
      <div className="relative rounded border border-[var(--color-border-primary)] bg-[#060a10] overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
          <defs>
            <pattern id="cybergrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#cybergrid)" />

          {flows.map((f) => {
            const [x1, y1] = project(f.from.lat, f.from.lng)
            const [x2, y2] = project(f.to.lat, f.to.lng)
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.18 - 8
            const color = f.vector === 'DDoS' ? '#ff3355' : f.vector === 'Exploit' ? '#ffb800' : '#00d4ff'
            return (
              <g key={f.id}>
                <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" stroke={color} strokeWidth="0.8" opacity="0.55"
                  strokeDasharray="3 4" className="cyber-flow" />
              </g>
            )
          })}

          {CYBER_ATTACK.attackers.map((a) => {
            const [x, y] = project(a.lat, a.lng)
            return (
              <g key={`a-${a.id}`}>
                <circle cx={x} cy={y} r="2.6" fill="#ff3355" />
                <text x={x + 4} y={y + 2.5} fill="#ff3355" style={{ font: '6px monospace' }}>{a.label}</text>
              </g>
            )
          })}
          {CYBER_ATTACK.targets.map((t) => {
            const [x, y] = project(t.lat, t.lng)
            return (
              <g key={`t-${t.id}`}>
                <circle cx={x} cy={y} r="2.6" fill="#00ff88" />
                <text x={x + 4} y={y + 2.5} fill="#00ff88" style={{ font: '6px monospace' }}>{t.label}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
        <StatTile label="Attack Volume" value={total.toLocaleString()} color="var(--color-accent-crimson)" />
        <StatTile label="Origin Nodes" value={CYBER_ATTACK.attackers.length} color="var(--color-accent-amber)" />
        <StatTile label="Target Nodes" value={CYBER_ATTACK.targets.length} color="var(--color-accent-emerald)" />
      </div>

      <div className="mt-1.5 max-h-[14vh] overflow-auto space-y-0.5">
        {flows.slice(0, 12).map((f) => (
          <div key={f.id} className="flex items-center gap-2 font-mono text-[9px]">
            <span className="text-[#ff3355] w-7">{f.from.label}</span>
            <span className="text-[var(--color-text-muted)]">→</span>
            <span className="text-[#00ff88] w-7">{f.to.label}</span>
            <span className="text-[var(--color-text-secondary)] flex-1 truncate">:{f.port} {f.vector}</span>
            <span className="text-[var(--color-text-muted)] w-8 text-right">{f.intensity}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export const ThreatAgentsPanel = () => {
  const { events } = useEvents()
  const botnets = useMemo(() => buildBotnets(), [])
  const c2Events = useMemo(() => Array.from(events.values()).filter((e) => e.category === 'c2'), [events])

  const columns = [
    { key: 'family', label: 'Family', render: (r) => <span className="text-[var(--color-text-primary)]">{r.family}</span> },
    { key: 'c2Count', label: 'C2', align: 'right' },
    { key: 'bots', label: 'Bots', align: 'right', render: (r) => r.bots.toLocaleString() },
    { key: 'country', label: 'Geo', align: 'right' },
    { key: 'trend', label: 'Δ', align: 'right', render: (r) => <span style={{ color: r.trend >= 0 ? '#ff3355' : '#00ff88' }}>{r.trend >= 0 ? '▲' : '▼'}{Math.abs(r.trend * 100).toFixed(0)}</span> }
  ]

  return (
    <Panel title="Active Threat Agents & Botnets (C2)" icon={Bug} accent="var(--color-accent-amber)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{c2Events.length} IOCs</span>}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <StatTile label="C2 Servers" value={c2Events.length} color="var(--color-accent-crimson)" />
        <StatTile label="Botnets" value={botnets.length} color="var(--color-accent-amber)" />
        <StatTile label="Infected" value={botnets.reduce((s, b) => s + b.bots, 0).toLocaleString()} color="var(--color-accent-violet)" />
      </div>
      <DataTable columns={columns} rows={botnets} rowKey={(r) => r.id} maxHeight="20vh" compact />
      {c2Events.length > 0 && (
        <div className="mt-1.5 max-h-[12vh] overflow-auto space-y-0.5">
          {c2Events.slice(0, 10).map((e) => (
            <div key={e.id} className="flex items-center gap-2 font-mono text-[9px]">
              <Dot color="#ff3355" size={5} />
              <span className="text-[var(--color-text-secondary)] truncate flex-1">{e.title} · {e.details?.ioc}</span>
              <span className="text-[var(--color-text-muted)]">{timeAgo(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export const CisaKevPanel = () => {
  const { events } = useEvents()
  const [filter, setFilter] = useState('')
  const kev = useMemo(
    () => Array.from(events.values()).filter((e) => e.category === 'cisa-kev'),
    [events]
  )
  const rows = useMemo(() => {
    const q = filter.toLowerCase()
    return kev.filter((e) => !q || JSON.stringify(e.details).toLowerCase().includes(q) || e.title.toLowerCase().includes(q)).slice(0, 60)
  }, [kev, filter])

  const columns = [
    { key: 'cve', label: 'CVE-ID', width: 92, render: (e) => <span className="text-[var(--color-accent-cyan)]">{e.title}</span> },
    { key: 'vendor', label: 'Vendor', render: (e) => e.details?.vendor || '—' },
    { key: 'product', label: 'Product', render: (e) => e.details?.product || '—' },
    { key: 'sev', label: 'Sev', width: 44, render: () => <Pill color="#ff3355">HIGH</Pill> },
    { key: 'action', label: 'Remediation', render: (e) => <span className="text-[var(--color-text-muted)] line-clamp-1">{e.details?.requiredAction || '—'}</span> }
  ]

  return (
    <Panel title="Known Exploited Vulnerabilities (CISA KEV)" icon={Shield} accent="var(--color-accent-crimson)"
      right={
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="w-24 bg-black/40 border border-[var(--color-border-primary)] rounded-sm px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent-cyan)]"
        />
      }>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} maxHeight="26vh" compact empty={kev.length ? 'NO MATCH' : 'AWAITING KEV FEED…'} />
    </Panel>
  )
}

export const PhishingMalwarePanel = () => {
  const { events } = useEvents()
  const items = useMemo(
    () => Array.from(events.values()).filter((e) => e.category === 'phishing' || e.category === 'malware'),
    [events]
  )
  const online = items.filter((e) => e.details?.url).length
  const tags = useMemo(() => {
    const t = {}
    items.forEach((e) => (e.details?.tags || []).forEach((x) => { t[x] = (t[x] || 0) + 1 }))
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])
  const maxTag = tags[0]?.[1] || 1

  return (
    <Panel title="Phishing & Malware Hosts" icon={Link2} accent="var(--color-accent-amber)"
      right={<span className="font-mono text-[9px] text-[var(--color-text-muted)]">{online} ONLINE</span>}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <StatTile label="Hosts" value={items.length} color="var(--color-accent-amber)" />
        <StatTile label="Online" value={online} color="var(--color-accent-crimson)" />
        <StatTile label="Families" value={new Set(items.map((e) => e.details?.threat)).size} color="var(--color-accent-violet)" />
      </div>

      <div className="space-y-1 mb-1.5">
        {tags.map(([t, n]) => (
          <div key={t} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-text-secondary)] w-24 truncate">{t}</span>
            <div className="flex-1"><Bar value={n / maxTag} color="var(--color-accent-amber)" height={3} /></div>
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-6 text-right">{n}</span>
          </div>
        ))}
      </div>

      <div className="max-h-[18vh] overflow-auto space-y-0.5">
        {items.slice(0, 20).map((e) => (
          <div key={e.id} className="flex items-center gap-2 font-mono text-[9px]">
            <Dot color={sevColor(e.severity)} size={5} />
            <span className="text-[var(--color-text-secondary)] truncate flex-1">{e.details?.url || e.title}</span>
            <span className="text-[var(--color-text-muted)]">{timeAgo(e.timestamp)}</span>
          </div>
        ))}
        {items.length === 0 && <div className="font-mono text-[9px] text-[var(--color-text-muted)] text-center py-2">AWAITING URLHAUS FEED…</div>}
      </div>
    </Panel>
  )
}
