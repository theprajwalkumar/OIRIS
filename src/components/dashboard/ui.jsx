import React from 'react'

// Design-system severity/status palette (Project Next Level tokens).
export const SEV_COLOR = {
  critical: '#FF5E4F',
  high: '#F0AE4B',
  medium: '#7CD3EA',
  info: '#7E93A6',
  low: '#4C6176',
  nominal: '#7CD3EA',
  caution: '#F0AE4B',
  elevated: '#F0AE4B',
  stable: '#7CD3EA',
  degraded: '#F0AE4B',
  operational: '#7CD3EA',
  active: '#FF5E4F',
  tracking: '#7CD3EA',
  standby: '#4C6176'
}

export const sevColor = (s) => SEV_COLOR[s] || '#4C6176'

export const Panel = ({ title, icon: Icon, accent = 'var(--color-ice)', right, children, className = '', dense = false, style }) => (
  <section
    className={`flex flex-col overflow-hidden rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel)] ${className}`}
    style={style}
  >
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} strokeWidth={1.75} />}
        <h3 className="truncate text-sm font-medium text-[var(--color-bone)]">{title}</h3>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
    <div className={dense ? 'min-h-0 flex-1' : 'min-h-0 flex-1 p-4'}>{children}</div>
  </section>
)

export const Dot = ({ color = '#7CD3EA', pulse = false, size = 6 }) => (
  <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
    {pulse && (
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: color }} />
    )}
    <span className="relative inline-flex h-full w-full rounded-full" style={{ background: color }} />
  </span>
)

export const Pill = ({ color = '#4C6176', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${className}`}
    style={{ color, borderColor: `${color}55`, background: `${color}14` }}
  >
    {children}
  </span>
)

export const StatTile = ({ label, value, sub, color = 'var(--color-ice)', icon: Icon, className = '' }) => (
  <div className={`flex flex-col justify-between rounded-lg border border-[var(--color-line)] px-3 py-2 ${className}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--color-mute)]">{label}</span>
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={1.75} />}
    </div>
    <div className="mt-1.5 font-serif text-2xl leading-none" style={{ color }}>{value}</div>
    {sub != null && <div className="mt-1 truncate text-[11px] text-[var(--color-faint)]">{sub}</div>}
  </div>
)

export const Bar = ({ value = 0, color = '#7CD3EA', height = 4, track = 'var(--color-line)' }) => (
  <div className="w-full overflow-hidden rounded-full" style={{ height, background: track }}>
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
    />
  </div>
)

export const DataTable = ({ columns, rows, empty = 'No data', rowKey = (r, i) => i, maxHeight, compact = false }) => (
  <div className="overflow-auto" style={{ maxHeight, scrollbarWidth: 'thin' }}>
    <table className="w-full border-collapse">
      <thead className="sticky top-0 z-10 bg-[var(--color-panel)]">
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={`border-b border-[var(--color-line)] text-left text-[11px] font-normal text-[var(--color-faint)] ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}
              style={{ width: c.width, textAlign: c.align || 'left' }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-2 py-3 text-center text-[12px] text-[var(--color-faint)]">{empty}</td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={rowKey(r, i)} className="transition-colors hover:bg-white/[0.03]">
            {columns.map((c) => (
              <td
                key={c.key}
                className={`border-b border-[var(--color-line)]/60 text-[12px] text-[var(--color-mute)] ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} align-top`}
                style={{ textAlign: c.align || 'left' }}
              >
                {c.render ? c.render(r) : r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const SectionDivider = ({ label, accent = 'var(--color-ice)' }) => (
  <div className="my-1 flex items-center gap-3">
    <span className="whitespace-nowrap text-xs" style={{ color: accent }}>{label}</span>
    <span className="h-px flex-1 bg-[var(--color-line)]" />
  </div>
)

export const timeAgo = (ts) => {
  if (!ts) return '—'
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export const pct = (n) => `${Math.round((n || 0) * 100)}%`