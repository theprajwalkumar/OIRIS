import React, { useMemo, useState } from 'react'
import { useEvents } from '../../context/EventContext.jsx'
import { buildAttackFlows, buildBotnets } from '../../utils/dashboardData.js'
import { Surface, Chip } from './Section.jsx'

const ago = (ts) => {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const FlowIntensity = ({ value }) => (
  <span className="flex items-center gap-2">
    <span className="h-1 w-14 overflow-hidden rounded-full bg-[var(--color-line)]">
      <span className="block h-full rounded-full bg-[var(--color-coral)]" style={{ width: `${value}%` }} />
    </span>
    <span className="w-6 text-right text-[11px] text-[var(--color-mute)]">{value}</span>
  </span>
)

const CyberSection = () => {
  const { events } = useEvents()
  const flows = useMemo(() => buildAttackFlows(), [])
  const botnets = useMemo(() => buildBotnets(), [])
  const [kevFilter, setKevFilter] = useState('')

  const c2 = useMemo(() => Array.from(events.values()).filter((e) => e.category === 'c2'), [events])
  const kev = useMemo(() => Array.from(events.values()).filter((e) => e.category === 'cisa-kev'), [events])
  const hosts = useMemo(
    () => Array.from(events.values()).filter((e) => e.category === 'phishing' || e.category === 'malware'),
    [events]
  )

  const kevRows = useMemo(() => {
    const q = kevFilter.toLowerCase()
    return kev
      .filter((e) => !q || JSON.stringify(e.details).toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
      .slice(0, 40)
  }, [kev, kevFilter])

  const onlineHosts = hosts.filter((e) => e.details?.url).length
  const volume = flows.reduce((s, f) => s + f.intensity, 0)
  const infected = botnets.reduce((s, b) => s + b.bots, 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Surface
        className="h-[calc(100vh-260px)] min-h-[420px]"
        title="Attack flows"
        right={<span className="text-[11px] text-[var(--color-faint)]">{volume.toLocaleString()} volume</span>}
        bodyClassName="scroll-area overflow-y-auto"
        footer={<p className="text-[11px] text-[var(--color-faint)]">Modelled reference flows derived from static origin/target sets.</p>}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-[var(--color-faint)]">
              <th className="pb-1 font-normal">Route</th>
              <th className="pb-1 font-normal">Vector</th>
              <th className="pb-1 text-right font-normal">Intensity</th>
            </tr>
          </thead>
          <tbody>
            {flows.slice(0, 12).map((f) => (
              <tr key={f.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="py-1.5 text-[12px] text-[var(--color-bone)]">{f.from.label} → {f.to.label}</td>
                <td className="py-1.5 text-[11px] text-[var(--color-mute)]">{f.vector} :{f.port}</td>
                <td className="py-1.5"><span className="flex justify-end"><FlowIntensity value={f.intensity} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>

      <Surface
        className="h-[calc(100vh-260px)] min-h-[420px]"
        title="Threat families"
        right={<span className="text-[11px] text-[var(--color-faint)]">{c2.length} C2 IOCs live</span>}
        bodyClassName="scroll-area overflow-y-auto"
        footer={<p className="text-[11px] text-[var(--color-faint)]">Botnet figures are modelled ({infected.toLocaleString()} bots); hosts and C2 are live.</p>}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-[var(--color-faint)]">
              <th className="pb-1 font-normal">Family</th>
              <th className="pb-1 text-right font-normal">C2</th>
              <th className="pb-1 text-right font-normal">Bots</th>
              <th className="pb-1 text-right font-normal">Geo</th>
              <th className="pb-1 text-right font-normal">Δ</th>
            </tr>
          </thead>
          <tbody>
            {botnets.map((b) => (
              <tr key={b.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="py-1.5 text-[12px] text-[var(--color-bone)]">{b.family}</td>
                <td className="py-1.5 text-right text-[12px] text-[var(--color-mute)]">{b.c2Count}</td>
                <td className="py-1.5 text-right text-[12px] text-[var(--color-mute)]">{b.bots.toLocaleString()}</td>
                <td className="py-1.5 text-right text-[12px] text-[var(--color-mute)]">{b.country}</td>
                <td className={`py-1.5 text-right text-[11px] ${b.trend >= 0 ? 'text-[var(--color-coral)]' : 'text-[var(--color-ice)]'}`}>
                  {b.trend >= 0 ? '▲' : '▼'}{Math.abs(b.trend * 100).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 border-t border-[var(--color-line)] pt-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-[var(--color-mute)]">Phishing and malware hosts</span>
            <span className="text-[var(--color-faint)]">{hosts.length} tracked · {onlineHosts} online</span>
          </div>
          <ul className="space-y-1">
            {hosts.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-[var(--color-mute)]">{e.details?.url || e.title}</span>
                <span className="text-[var(--color-faint)]">{ago(e.timestamp)}</span>
              </li>
            ))}
            {hosts.length === 0 && <li className="text-[11px] text-[var(--color-faint)]">Awaiting URLhaus feed.</li>}
          </ul>
        </div>
      </Surface>

      <Surface
        className="h-[calc(100vh-260px)] min-h-[420px]"
        title="Known exploited vulnerabilities"
        right={
          <input
            value={kevFilter}
            onChange={(e) => setKevFilter(e.target.value)}
            placeholder="Filter CVEs"
            aria-label="Filter known exploited vulnerabilities"
            className="w-28 rounded-full border border-[var(--color-line)] bg-transparent px-2.5 py-1 text-xs text-[var(--color-bone)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-ice)]"
          />
        }
        bodyClassName="scroll-area overflow-y-auto"
        footer={<p className="text-[11px] text-[var(--color-faint)]">{kev.length} known exploited vulnerabilities tracked.</p>}
      >
        <ul className="divide-y divide-[var(--color-line)]">
          {kevRows.map((e) => (
            <li key={e.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[var(--color-ice)]">{e.title}</span>
                <Chip tone="coral">high</Chip>
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-faint)]">
                {[e.details?.vendor, e.details?.product].filter(Boolean).join(' · ') || 'vendor unknown'}
                {e.details?.requiredAction ? ` · ${e.details.requiredAction}` : ''}
              </div>
            </li>
          ))}
        </ul>
        {kevRows.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-faint)]">
            {kev.length ? 'No matching CVEs.' : 'Awaiting CISA KEV feed.'}
          </p>
        )}
      </Surface>
    </div>
  )
}

export default CyberSection