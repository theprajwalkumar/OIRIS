import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, ChevronDown, Plane, Map, Radar, Crosshair, ListFilter, RadioTower } from 'lucide-react'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useFlights } from '../context/FlightContext.jsx'
import { useFeedHealth } from '../hooks/useFeedHealth.js'
import { MAP_LEGEND } from '../utils/constants.js'

const fmtAge = (ms) => {
  if (ms == null) return '—'
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${Math.round(ms / 3600000)}h`
}

const Section = ({ title, icon: Icon, children, defaultOpen = true, badge }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[var(--color-border-primary)] last:border-b-0">
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--color-bg-tertiary)] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">{title}</span>
        </span>
        <span className="flex items-center gap-2">
          {badge}
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const SourceDot = ({ source, feed }) => {
  if (!source) return null
  if (source.kind === 'static') {
    return <span className="font-mono text-[8px] text-[var(--color-text-muted)]" title="Static reference data">REF</span>
  }
  if (source.kind === 'none') {
    return <span className="font-mono text-[8px] text-[var(--color-accent-crimson)]" title="No live source connected yet">N/A</span>
  }
  const color = feed?.color || '#64748b'
  const label = feed ? `${feed.label} · ${fmtAge(feed?.ageMs)}` : 'NO DATA'
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      title={label}
    />
  )
}

const LayerCheckbox = ({ layer, groupColor, active, onToggle, source, feed }) => (
  <label className="flex items-center gap-2 py-1 cursor-pointer group">
    <input
      type="checkbox"
      checked={active}
      onChange={onToggle}
      className="w-3 h-3 accent-[var(--color-accent-cyan)] cursor-pointer"
    />
    <span className="flex-1 min-w-0">
      <span className="font-mono text-[11px] truncate block" style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        {layer.label}
      </span>
    </span>
    <SourceDot source={source} feed={feed} />
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active ? groupColor : 'transparent', border: `1px solid ${groupColor}` }} />
  </label>
)

const FloatingMapControls = () => {
  const { layerGroups, layerSources, activeLayers, toggleLayer } = useMapLayers()
  const { radar, rangeVisible, setRangeVisible, flyToUser, flyToDelhi, activateRadar, clearRadar } = useFlights()
  const { feeds, summary } = useFeedHealth()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState({ geopolitics: true })

  const feedFor = (layerId) => {
    const src = layerSources[layerId]
    if (!src || src.kind !== 'live') return undefined
    return feeds[src.feed]
  }

  const feedEntries = Object.entries(feeds).sort((a, b) => a[0].localeCompare(b[0]))

  if (collapsed) {
    return (
      <motion.button
        className="fixed bottom-12 left-4 z-30 panel-glass border border-[var(--color-border-primary)] rounded-lg p-2 pointer-events-auto flex items-center gap-2"
        onClick={() => setCollapsed(false)}
        title="Open Map Controls"
      >
        <Layers className="w-4 h-4 text-[var(--color-accent-cyan)]" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">Map</span>
      </motion.button>
    )
  }

  return (
    <motion.div
      className="fixed bottom-12 left-4 z-30 w-[300px] panel-glass border border-[var(--color-border-primary)] rounded-lg pointer-events-auto overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-primary)]"
        style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), transparent)' }}>
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-primary)]">Map Layers</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
            FEEDS <span className="text-[var(--color-accent-emerald)]">{summary.ok}</span>/{summary.total}
          </span>
          <button className="btn-tactical p-1" onClick={() => setCollapsed(true)} title="Collapse">
            <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          </button>
        </span>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
        <Section title="Layers" icon={ListFilter}>
          {Object.values(layerGroups).map(group => (
            <div key={group.id} className="mb-1">
              <button
                className="w-full flex items-center justify-between py-1"
                onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
              >
                <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: group.color }}>
                  {group.label}
                </span>
                <ChevronDown className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform ${openGroups[group.id] ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              {(openGroups[group.id] || false) && (
                <div className="pl-2">
                  {group.layers.map(layer => (
                    <LayerCheckbox
                      key={layer.id}
                      layer={layer}
                      groupColor={group.color}
                      active={!!activeLayers[layer.id]}
                      onToggle={() => toggleLayer(layer.id)}
                      source={layerSources[layer.id]}
                      feed={feedFor(layer.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>

        <Section
          title="Data Feeds"
          icon={RadioTower}
          defaultOpen={false}
          badge={<span className="font-mono text-[9px]" style={{ color: summary.ok === summary.total && summary.total > 0 ? '#00ff88' : '#ffb800' }}>{summary.ok}/{summary.total} LIVE</span>}
        >
          {feedEntries.length === 0 ? (
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">Awaiting first health poll…</div>
          ) : (
            <div className="space-y-1">
              {feedEntries.map(([key, f]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.color, boxShadow: `0 0 6px ${f.color}` }} />
                  <span className="font-mono text-[10px] text-[var(--color-text-secondary)] flex-1 min-w-0 truncate">{key}</span>
                  <span className="font-mono text-[9px] text-[var(--color-text-muted)] tabular-nums">{f.recordCount ?? '–'} rec</span>
                  <span className="font-mono text-[9px] tabular-nums" style={{ color: f.color }}>{fmtAge(f.ageMs)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Live Flights / Radar" icon={Radar}>
          <div className="grid grid-cols-1 gap-1.5">
            <button className="btn-tactical w-full justify-center text-[10px] py-1.5" onClick={() => flyToUser()}>
              <Crosshair className="w-3 h-3 mr-1" /> PAN TO MY SKY
            </button>
            <button className="btn-tactical w-full justify-center text-[10px] py-1.5" onClick={() => flyToDelhi()}>
              <Map className="w-3 h-3 mr-1" /> FLY TO DELHI (DEL)
            </button>
            <div className="flex gap-1.5 mt-0.5">
              {radar && (
                <button className="btn-tactical flex-1 justify-center text-[10px] py-1" onClick={() => activateRadar(radar.lat, radar.lng, radar.dist)}>
                  REFRESH
                </button>
              )}
              {radar && (
                <button className="btn-tactical flex-1 justify-center text-[10px] py-1" onClick={clearRadar}>
                  CLEAR
                </button>
              )}
              <button
                className="btn-tactical flex-1 justify-center text-[10px] py-1"
                onClick={() => setRangeVisible(!rangeVisible)}
                title="Toggle range rings"
              >
                RINGS {rangeVisible ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </Section>

        <Section title="Legend" icon={Layers}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {MAP_LEGEND.map(item => (
              <div key={item.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                <span className="font-mono text-[9px] uppercase tracking-wide text-[var(--color-text-secondary)]">{item.label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Flights Feed" icon={Plane} defaultOpen={false}>
          <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
            Live telemetry mixed from OpenSky Network and community ADS-B ground stations. Click any aircraft for its route vector and full flight info.
          </div>
        </Section>
      </div>
    </motion.div>
  )
}

export default FloatingMapControls
