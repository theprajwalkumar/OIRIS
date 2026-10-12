import React, { useEffect, useState } from 'react'
import { useEvents } from '../../context/EventContext.jsx'
import { useMapLayers } from '../../context/MapLayerContext.jsx'
import { RANGE_PRESETS } from '../../config/sections.js'

const UtcClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const ss = String(now.getUTCSeconds()).padStart(2, '0')
  return (
    <div className="text-right leading-tight">
      <div className="text-sm text-[var(--color-bone)]">{hh}:{mm}:{ss}</div>
      <div className="text-[10px] text-[var(--color-faint)]">UTC</div>
    </div>
  )
}

/**
 * Sticky 72px top bar: wordmark, watch-status pill, time-range segmented
 * control, and UTC clock. Ranges drive the shared MapLayerContext timeRange.
 */
const AppTopBar = ({ range, onRange }) => {
  const { stats } = useEvents()
  const { setTimeRange } = useMapLayers()

  const watch = stats.critical > 0 ? 'Elevated watch' : 'Steady watch'

  const chooseRange = (preset) => {
    onRange?.(preset.id)
    setTimeRange({ start: Date.now() - preset.ms, end: Date.now() })
  }

  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-ink)]/95 px-5 backdrop-blur">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-[28px] leading-none tracking-tight text-[var(--color-bone)]">World Monitor</span>
        <span className="text-xs text-[var(--color-faint)]">Project Next Level</span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="rounded-full border border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10 px-3 py-1 text-xs text-[var(--color-brass)]"
          role="status"
        >
          {watch}
        </span>

        <div
          role="group"
          aria-label="Time range"
          className="flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-0.5"
        >
          {RANGE_PRESETS.map((p) => {
            const active = range === p.id
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseRange(p)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  active ? 'bg-[var(--color-brass)] text-[var(--color-ink)]' : 'text-[var(--color-mute)] hover:text-[var(--color-bone)]'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <UtcClock />
      </div>
    </header>
  )
}

export default AppTopBar
