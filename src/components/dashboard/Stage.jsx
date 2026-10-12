import React, { useCallback, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import GlobeCanvas from '../globe/GlobeCanvas.jsx'
import LayerChips from '../globe/LayerChips.jsx'
import { useEvents } from '../../context/EventContext.jsx'
import { GLOBE_LAYERS, SEVERITY_COLOR, buildGlobePoints, countByLayer } from '../../utils/globeData.js'
import { Chip } from '../sections/Section.jsx'

const ago = (ts) => {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const LAYER_LABEL = Object.fromEntries(GLOBE_LAYERS.map((l) => [l.id, l.label]))

const SeverityDot = ({ severity }) => (
  <span
    aria-hidden="true"
    className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
    style={{ background: SEVERITY_COLOR[severity] || SEVERITY_COLOR.info }}
  />
)

const Stage = () => {
  const { events } = useEvents()
  const [active, setActive] = useState(() => new Set(GLOBE_LAYERS.map((l) => l.id)))
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const points = useMemo(() => buildGlobePoints(events), [events])
  const counts = useMemo(() => countByLayer(points), [points])

  const dispatch = useMemo(() => {
    const rows = points
      .filter((p) => p.severity === 'critical' || p.severity === 'high')
      .sort((a, b) => (a.severity === b.severity ? b.timestamp - a.timestamp : a.severity === 'critical' ? -1 : 1))
    const filtered = filter === 'all' ? rows : rows.filter((p) => p.severity === filter)
    return { rows, filtered: filtered.slice(0, 16) }
  }, [points, filter])

  const selectFromList = useCallback((point) => setSelected(point), [])
  const onGlobeSelect = useCallback((point) => setSelected(point), [])

  const toggleLayer = (id) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const online = points.length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_392px]">
      {/* Stage */}
      <div className="relative min-h-[420px] overflow-hidden rounded-[14px] border border-[var(--color-line)] bg-[var(--color-deep)] lg:min-h-[580px]">
        <GlobeCanvas
          points={points}
          activeLayers={active}
          selectedId={selected?.id}
          onSelect={onGlobeSelect}
          focus={selected}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
          <LayerChips counts={counts} active={active} onToggle={toggleLayer} />
          <div className="pointer-events-none hidden items-center gap-3 rounded-full border border-[var(--color-line)] bg-[var(--color-ink)]/80 px-3 py-1.5 backdrop-blur md:flex">
            {Object.entries(SEVERITY_COLOR).map(([sev, color]) => (
              <span key={sev} className="flex items-center gap-1.5 text-[11px] text-[var(--color-mute)]">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                {sev}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Critical dispatch */}
      <aside className="flex min-h-[420px] flex-col rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel)] lg:max-h-[580px]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <h3 className="text-sm font-medium text-[var(--color-bone)]">Critical dispatch</h3>
          <span className="text-[11px] text-[var(--color-faint)]">{online} plotted · live</span>
        </div>

        <div role="group" aria-label="Severity filter" className="flex items-center gap-1.5 border-b border-[var(--color-line)] px-4 py-2">
          {['all', 'critical', 'high'].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors ${
                filter === f
                  ? 'border-[var(--color-brass)]/60 bg-[var(--color-brass)]/10 text-[var(--color-brass)]'
                  : 'border-[var(--color-line)] text-[var(--color-faint)] hover:text-[var(--color-mute)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {selected && (
          <div className="border-b border-[var(--color-line)] bg-[var(--color-deep)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Chip tone={selected.severity === 'critical' ? 'coral' : selected.severity === 'high' ? 'amber' : 'ice'}>
                    {selected.severity}
                  </Chip>
                  <Chip>{LAYER_LABEL[selected.layer] || selected.layer}</Chip>
                  <span className="text-[11px] text-[var(--color-faint)]">{ago(selected.timestamp)}</span>
                </div>
                <p className="text-sm text-[var(--color-bone)]">{selected.title}</p>
                {selected.summary && <p className="mt-1 text-xs leading-relaxed text-[var(--color-mute)]">{selected.summary}</p>}
                <p className="mt-1 text-[11px] text-[var(--color-faint)]">
                  {selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}°
                  {selected.sourceCount > 1 ? ` · ${selected.sourceCount} sources` : ''}
                  {selected.static ? ' · static reference' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close selection"
                className="rounded-md p-1 text-[var(--color-faint)] transition-colors hover:text-[var(--color-bone)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <ul className="min-h-0 flex-1 divide-y divide-[var(--color-line)] overflow-y-auto">
          {dispatch.filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[var(--color-faint)]">
              No critical or high events in this range.
            </li>
          )}
          {dispatch.filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => selectFromList(p)}
                aria-current={selected?.id === p.id ? 'true' : undefined}
                className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03] ${
                  selected?.id === p.id ? 'bg-white/[0.04]' : ''
                }`}
              >
                <SeverityDot severity={p.severity} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-[var(--color-bone)]">{p.title}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-faint)]">
                    {LAYER_LABEL[p.layer] || p.layer} · {ago(p.timestamp)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--color-line)] px-4 py-2 text-[11px] text-[var(--color-faint)]">
          Drag the globe to rotate · Esc to clear selection
        </div>
      </aside>
    </div>
  )
}

export default Stage