import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plane, MapPin, Gauge, Navigation, Hash, ArrowRight, Loader2, Target } from 'lucide-react'
import { useFlights } from '../context/FlightContext.jsx'

const Row = ({ label, value, accent }) => (
  <div className="flex items-center justify-between py-0.5">
    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
    <span className="font-mono text-xs" style={{ color: accent || 'var(--color-text-primary)' }}>{value}</span>
  </div>
)

const FlightInfoCard = () => {
  const { selectedFlight, route, aircraftInfo, selectFlight, flyTo, clearSelection } = useFlights()

  if (!selectedFlight) return null

  const f = selectedFlight
  const color = f.military ? '#b84dff' : '#00d4ff'

  return (
    <AnimatePresence>
      {f && (
        <motion.div
          key={f.icao24}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-[360px] panel-glass border border-[var(--color-border-glow)] rounded-lg pointer-events-auto overflow-hidden"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-primary)]"
            style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}>
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4" style={{ color }} />
              <span className="font-mono text-sm font-bold tracking-wider" style={{ color }}>{f.callsign}</span>
              {f.military && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#b84dff22', color: '#b84dff', border: '1px solid #b84dff44' }}>
                  MILITARY
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-tactical p-1" title="Fly to aircraft" aria-label="Fly to aircraft"
                onClick={() => flyTo(f.lat, f.lng, 9)}>
                <Target className="w-3.5 h-3.5" />
              </button>
              <button className="btn-tactical p-1" title="Close" aria-label="Close"
                onClick={clearSelection}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 grid grid-cols-2 gap-x-4">
            <div>
              <Row label="ICAO24" value={(f.icao24 || '').toUpperCase()} />
              <Row label="Registration" value={f.registration || aircraftInfo?.registration || '—'} />
              <Row label="Type" value={f.aircraftType || aircraftInfo?.type || '—'} />
              <Row label="Airline" value={route?.airline || aircraftInfo?.owner || '—'} />
            </div>
            <div>
              <Row label="Altitude" value={f.altitude != null ? `${f.altitude.toLocaleString()} ft` : '—'} />
              <Row label="Speed" value={f.velocity != null ? `${f.velocity} kts` : '—'} />
              <Row label="Heading" value={`${Math.round(f.heading || 0)}°`} />
              <Row label="Squawk" value={f.squawk || '—'} />
            </div>
          </div>

          <div className="px-3 py-2 border-t border-[var(--color-border-primary)]">
            {route === null ? (
              <div className="flex items-center justify-center gap-2 py-2 text-[var(--color-text-muted)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="font-mono text-[10px] uppercase tracking-wider">Resolving route...</span>
              </div>
            ) : route?.found ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Origin</div>
                  <div className="font-mono text-sm text-[var(--color-accent-emerald)]">{route.origin?.iata || '???'}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate">{route.origin?.name || ''}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Destination</div>
                  <div className="font-mono text-sm text-[var(--color-accent-violet)]">{route.destination?.iata || '???'}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate">{route.destination?.name || ''}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Route unavailable
              </div>
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-[var(--color-border-primary)] flex items-center justify-between">
            <span className="font-mono text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {f.lat?.toFixed(3)}, {f.lng?.toFixed(3)}
            </span>
            <span className="font-mono text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {f.verticalRate > 0 ? '▲' : f.verticalRate < 0 ? '▼' : '—'} {Math.abs(f.verticalRate || 0)} ft/min
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FlightInfoCard
