import React from 'react'

/**
 * Full-width editorial section: serif H2, one-line description, small live
 * status on the right, hairline top rule and generous vertical rhythm.
 * Deliberately not a boxed card (per the design system).
 */
export const Section = ({ id, title, description, status, children }) => (
  <section id={id} className="scroll-mt-24 border-t border-[var(--color-line)] py-14 first:border-t-0">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <h2 className="font-serif text-[34px] leading-tight text-[var(--color-bone)]">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-[var(--color-mute)]">{description}</p>}
      </div>
      {status && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-faint)]">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-ice)]" />
          {status}
        </div>
      )}
    </header>
    {children}
  </section>
)

/** Flat data surface: panel colour, hairline border, 14px radius. */
export const Surface = ({ title, right, children, className = '', padded = true }) => (
  <div className={`rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel)] ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-2.5">
        {title && <h3 className="text-sm font-medium text-[var(--color-bone)]">{title}</h3>}
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    )}
    <div className={padded ? 'p-4' : ''}>{children}</div>
  </div>
)

/** Sentence-case status chip (999px). */
export const Chip = ({ tone = 'mute', children, className = '', ...rest }) => {
  const tones = {
    mute: 'border-[var(--color-line)] text-[var(--color-mute)]',
    ice: 'border-[var(--color-ice)]/50 text-[var(--color-ice)] bg-[var(--color-ice)]/10',
    brass: 'border-[var(--color-brass)]/50 text-[var(--color-brass)] bg-[var(--color-brass)]/10',
    coral: 'border-[var(--color-coral)]/50 text-[var(--color-coral)] bg-[var(--color-coral)]/10',
    amber: 'border-[var(--color-amber)]/50 text-[var(--color-amber)] bg-[var(--color-amber)]/10',
    violet: 'border-[var(--color-violet)]/50 text-[var(--color-violet)] bg-[var(--color-violet)]/10'
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${tones[tone] || tones.mute} ${className}`} {...rest}>
      {children}
    </span>
  )
}
