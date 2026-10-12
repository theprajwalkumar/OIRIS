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
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-ink)]/95 px-4 backdrop-blur md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src="/assets/osiris-emblem.svg"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 filter-cyan-glow"
        />
        <span className="truncate font-serif text-[24px] leading-none tracking-tight text-[var(--color-bone)] md:text-[28px]">OSIRIS</span>
      </div>

      <div className="flex shrink-0 items-center gap-3 md:gap-4">
        <span
          className="hidden rounded-full border border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10 px-3 py-1 text-xs text-[var(--color-brass)] lg:inline-block"
          role="status"
        >
          {watch}
        </span>

        <div
          role="group"
          aria-label="Time range"
          className="flex shrink-0 items-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-0.5"
        >
          {RANGE_PRESETS.map((p) => {
            const active = range === p.id
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseRange(p)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors md:px-3 ${
                  active ? 'bg-[var(--color-brass)] text-[var(--color-ink)]' : 'text-[var(--color-mute)] hover:text-[var(--color-bone)]'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <div className="hidden sm:block">
          <UtcClock />
        </div>
      </div>
    </header>
  )
}

export default AppTopBar
