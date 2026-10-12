import React from 'react'
import { GLOBE_LAYERS } from '../../utils/globeData.js'

/** Layer toggles with live counts, overlaid on the stage. */
const LayerChips = ({ counts, active, onToggle }) => (
  <div
    role="group"
    aria-label="Map layers"
    className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-ink)]/80 px-1.5 py-1.5 backdrop-blur"
  >
    {GLOBE_LAYERS.map((l) => {
      const on = active.has(l.id)
      return (
        <button
          key={l.id}
          type="button"
          aria-pressed={on}
          onClick={() => onToggle(l.id)}
          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
            on
              ? 'border-[var(--color-ice)]/60 bg-[var(--color-ice)]/10 text-[var(--color-ice)]'
              : 'border-[var(--color-line)] text-[var(--color-faint)] hover:text-[var(--color-mute)]'
          }`}
        >
          {l.label}
          <span className="ml-1.5 opacity-70">{counts[l.id] || 0}</span>
        </button>
      )
    })}
  </div>
)

export default LayerChips