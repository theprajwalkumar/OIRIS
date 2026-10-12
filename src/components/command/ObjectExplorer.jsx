import React, { useMemo, useState } from 'react'
import { X, Search, Crosshair, Target, Radar, Share2, Shield, MapPin } from 'lucide-react'
import { useOntology } from '../../context/OntologyContext.jsx'
import { useFlights } from '../../context/FlightContext.jsx'
import { CLASSIFICATION_META, classificationColor } from '../../utils/constants.js'
import { Pill, sevColor, timeAgo } from '../dashboard/ui.jsx'
import EntityGraph from './EntityGraph.jsx'

const CLASS_ORDER = ['hostile', 'unknown', 'friendly', 'neutral']

const ObjectExplorer = ({ open, onClose }) => {
  const { entities, stats, query, getEntity, graph, classify, taskSensor, selectedEntityId, setSelectedEntity } = useOntology()
  const { flyTo } = useFlights()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(null)

  const filtered = useMemo(
    () => query({ text: search, types: typeFilter ? [typeFilter] : undefined, limit: 150 }),
    [query, search, typeFilter, entities]
  )

  const selected = useMemo(() => {
    if (selectedEntityId && getEntity(selectedEntityId)) return getEntity(selectedEntityId)
    return filtered[0] || null
  }, [selectedEntityId, getEntity, filtered])

  const relGraph = useMemo(() => (selected ? graph(selected.id, 1) : null), [selected, graph])
  const types = useMemo(() => {
    const set = new Set(entities.map((e) => e.type))
    return Array.from(set)
  }, [entities])

  if (!open) return null

  const cls = CLASSIFICATION_META[selected?.classification] || CLASSIFICATION_META.unknown

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-6xl h-[86vh] panel-glass border border-[var(--color-border-glow)] rounded-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--color-border-primary)] bg-black/40 shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-text-primary)]">Object Explorer · Entity Graph</span>
            <Pill color="#00d4ff">{stats.total} OBJ</Pill>
            <Pill color="#b84dff">{stats.edges} REL</Pill>
            <Pill color="#00ff88">{stats.geo} GEO</Pill>
          </div>
          <button className="btn-tactical p-1.5" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: search + list */}
          <div className="flex flex-col min-h-0 border-r border-[var(--color-border-primary)]">
            <div className="p-2 border-b border-[var(--color-border-primary)] shrink-0">
              <div className="flex items-center gap-2 input-tactical">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search objects, callsigns, indicators, countries…"
                  className="flex-1 bg-transparent outline-none font-mono text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                />
                {search && <button onClick={() => setSearch('')} className="text-[var(--color-text-muted)]"><X className="w-3 h-3" /></button>}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <button
                  onClick={() => setTypeFilter(null)}
                  className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border ${!typeFilter ? 'border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)]' : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)]'}`}
                >ALL</button>
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t === typeFilter ? null : t)}
                    className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border ${t === typeFilter ? 'border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)]' : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)]'}`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {filtered.length === 0 && (
                <div className="p-6 text-center font-mono text-[10px] text-[var(--color-text-muted)]">NO OBJECTS MATCH</div>
              )}
              {filtered.map((e) => {
                const c = classificationColor(e.classification)
                const active = selected?.id === e.id
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEntity(e.id)}
                    className={`w-full text-left px-2.5 py-2 border-b border-[var(--color-border-primary)]/50 transition-colors ${active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                      <span className="font-mono text-[11px] text-[var(--color-text-primary)] truncate flex-1">{e.label}</span>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">{e.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 pl-3.5">
                      <span className="font-mono text-[9px] truncate" style={{ color: sevColor(e.severity) }}>{e.severity.toUpperCase()}</span>
                      <span className="font-mono text-[9px] text-[var(--color-text-muted)] truncate">{e.subtitle}</span>
                      <span className="ml-auto font-mono text-[8px] text-[var(--color-text-muted)] shrink-0">{timeAgo(e.timestamp)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: object card + graph */}
          <div className="flex flex-col min-h-0 overflow-y-auto p-2.5 space-y-2.5" style={{ scrollbarWidth: 'thin' }}>
            {!selected && <div className="font-mono text-[10px] text-[var(--color-text-muted)]">Select an object to inspect.</div>}
            {selected && (
              <>
                <div className="border border-[var(--color-border-primary)] rounded-md p-2.5" style={{ boxShadow: `inset 0 0 24px ${cls.color}14` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-[var(--color-text-primary)] truncate" style={{ textShadow: `0 0 8px ${cls.color}66` }}>{selected.label}</div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate">{selected.subtitle}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Pill color={cls.color}>{cls.label}</Pill>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-text-muted)]">{selected.type}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                    <Field k="SEVERITY" v={selected.severity?.toUpperCase()} color={sevColor(selected.severity)} />
                    <Field k="SOURCE" v={selected.source} />
                    <Field k="ORIGIN" v={selected.countryCode || '—'} />
                    <Field k="COORD" v={selected.geocode ? `${selected.lat.toFixed(3)}, ${selected.lng.toFixed(3)}` : 'NO GEO'} />
                  </div>

                  {selected.props && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-[var(--color-border-primary)]/60">
                      {Object.entries(selected.props).map(([k, v]) => (
                        <Field key={k} k={k.toUpperCase()} v={v == null || v === '' ? '—' : String(v)} />
                      ))}
                    </div>
                  )}
                  {selected.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selected.tags.map((t) => <Pill key={t} color="#64748b">#{t}</Pill>)}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {CLASS_ORDER.map((c) => (
                      <button
                        key={c}
                        onClick={() => classify(selected.id, c, selected.label)}
                        className="px-1.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border transition-colors"
                        style={{ borderColor: `${CLASSIFICATION_META[c].color}55`, color: CLASSIFICATION_META[c].color, background: selected.classification === c ? `${CLASSIFICATION_META[c].color}22` : 'transparent' }}
                      >
                        {c}
                      </button>
                    ))}
                    <span className="mx-1 h-4 w-px bg-[var(--color-border-primary)]" />
                    <button
                      disabled={!selected.geocode}
                      onClick={() => { flyTo(selected.lat, selected.lng, 6); onClose?.() }}
                      className="btn-tactical px-1.5 py-0.5 text-[9px] inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <Target className="w-3 h-3" /> FLY
                    </button>
                    <button
                      disabled={!selected.geocode}
                      onClick={() => taskSensor({ lat: selected.lat, lng: selected.lng, targetLabel: selected.label })}
                      className="btn-tactical warning px-1.5 py-0.5 text-[9px] inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <Radar className="w-3 h-3" /> TASK SENSOR
                    </button>
                  </div>
                </div>

                <div className="border border-[var(--color-border-primary)] rounded-md overflow-hidden">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[var(--color-border-primary)] bg-black/30">
                    <Crosshair className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-primary)]">Relationship Graph</span>
                    <span className="ml-auto font-mono text-[9px] text-[var(--color-text-muted)]">{relGraph?.nodes.length || 0} NODES</span>
                  </div>
                  <div className="h-64 bg-black/20">
                    <EntityGraph graph={relGraph} selectedId={selected.id} onSelect={setSelectedEntity} />
                  </div>
                </div>

                <div className="border border-[var(--color-border-primary)] rounded-md p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-[var(--color-accent-violet)]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-primary)]">Provenance</span>
                  </div>
                  <Field k="FEED" v={selected.provenance?.feed || selected.source} />
                  <Field k="RAW ID" v={selected.provenance?.rawId || selected.id} />
                  <div className="flex items-center gap-1 mt-1 font-mono text-[9px] text-[var(--color-text-muted)]">
                    <MapPin className="w-3 h-3" /> Ingested {timeAgo(selected.timestamp)} ago
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const Field = ({ k, v, color }) => (
  <div className="flex items-baseline gap-1.5 min-w-0">
    <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">{k}</span>
    <span className="font-mono text-[10px] truncate" style={{ color: color || 'var(--color-text-secondary)' }}>{v}</span>
  </div>
)

export default ObjectExplorer
