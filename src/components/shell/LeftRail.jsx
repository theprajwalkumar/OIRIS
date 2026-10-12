import React from 'react'
import { Radar, Activity, LineChart, ShieldAlert, Plane, Globe } from 'lucide-react'
import { SECTIONS } from '../../config/sections.js'

const ICONS = { Radar, Activity, LineChart, ShieldAlert, Plane, Globe }

/**
 * Fixed 64px left rail. Active item follows scroll (controlled by the shell's
 * scroll-spy). Each item is an accessible button that scrolls to its section.
 */
const LeftRail = ({ activeId, onJump }) => (
  <nav
    aria-label="Sections"
    className="fixed left-0 top-0 z-50 hidden h-full w-16 flex-col items-center gap-1 border-r border-[var(--color-line)] bg-[var(--color-deep)] py-3 md:flex"
  >
    <a
      href="#situation"
      onClick={(e) => { e.preventDefault(); onJump?.('situation') }}
      aria-label="OSIRIS — back to top"
      className="mb-2 flex h-10 w-10 items-center justify-center"
    >
      <img src="/assets/osiris-emblem.svg" alt="" aria-hidden="true" className="h-8 w-8" />
    </a>

    {SECTIONS.map((s) => {
      const Icon = ICONS[s.icon] || Globe
      const active = activeId === s.id
      return (
        <button
          key={s.id}
          type="button"
          onClick={() => onJump?.(s.id)}
          aria-label={s.label}
          aria-current={active ? 'true' : undefined}
          title={s.label}
          className={`group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
            active
              ? 'text-[var(--color-brass)]'
              : 'text-[var(--color-faint)] hover:text-[var(--color-bone)]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-opacity ${
              active ? 'bg-[var(--color-brass)] opacity-100' : 'opacity-0'
            }`}
          />
          <Icon className="h-5 w-5" strokeWidth={1.75} />
          <span className="pointer-events-none absolute left-[54px] z-50 hidden whitespace-nowrap rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-xs text-[var(--color-bone)] group-hover:block">
            {s.label}
          </span>
        </button>
      )
    })}
  </nav>
)

export default LeftRail
