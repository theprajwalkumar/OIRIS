import React from 'react'

export const SEV_COLOR = {
  critical: '#ff3355',
  high: '#ffb800',
  medium: '#00d4ff',
  info: '#00ff88',
  low: '#64748b',
  nominal: '#00ff88',
  caution: '#ffb800',
  elevated: '#ffb800',
  stable: '#00ff88',
  degraded: '#ffb800',
  operational: '#00ff88',
  active: '#ff3355',
  tracking: '#00ff88',
  standby: '#64748b'
}

export const sevColor = (s) => SEV_COLOR[s] || '#64748b'

export const Panel = ({ title, icon: Icon, accent = 'var(--color-accent-cyan)', right, children, className = '', dense = false, style }) => (
  <section
    className={`panel-glass border border-[var(--color-border-primary)] rounded-md overflow-hidden flex flex-col ${className}`}
    style={style}
  >
    <header className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-[var(--color-border-primary)] bg-black/30 shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />}
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-primary)] truncate">{title}</h3>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </header>
    <div className={dense ? 'flex-1 min-h-0' : 'flex-1 min-h-0 p-2.5'}>{children}</div>
  </section>
)

export const Dot = ({ color = '#00ff88', pulse = false, size = 6 }) => (
  <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
    {pulse && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
    )}
    <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
  </span>
)

export const Pill = ({ color = '#64748b', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider ${className}`}
    style={{ color, background: `${color}1a`, border: `1px solid ${color}33` }}
  >
    {children}
  </span>
)

export const StatTile = ({ label, value, sub, color = 'var(--color-accent-cyan)', icon: Icon, className = '' }) => (
  <div className={`panel-glass rounded border border-[var(--color-border-primary)] px-2.5 py-2 flex flex-col justify-between ${className}`}>
    <div className="flex items-center justify-between">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      {Icon && <Icon className="w-3 h-3" style={{ color }} />}
    </div>
    <div className="font-mono text-lg leading-none mt-1.5" style={{ color }}>{value}</div>
    {sub != null && <div className="font-mono text-[9px] text-[var(--color-text-muted)] mt-1 truncate">{sub}</div>}
  </div>
)

export const Bar = ({ value = 0, color = '#00d4ff', height = 4, track = 'rgba(255,255,255,0.06)' }) => (
  <div className="w-full rounded-full overflow-hidden" style={{ height, background: track }}>
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color, boxShadow: `0 0 8px ${color}88` }}
    />
  </div>
)

export const DataTable = ({ columns, rows, empty = 'NO DATA', rowKey = (r, i) => i, maxHeight, compact = false }) => (
  <div className="overflow-auto" style={{ maxHeight, scrollbarWidth: 'thin' }}>
    <table className="w-full border-collapse">
      <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={`text-left font-mono text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-primary)] ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}
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
            <td colSpan={columns.length} className="px-2 py-3 text-center font-mono text-[10px] text-[var(--color-text-muted)]">{empty}</td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={rowKey(r, i)} className="hover:bg-white/[0.03] transition-colors">
            {columns.map((c) => (
              <td
                key={c.key}
                className={`font-mono ${compact ? 'text-[10px] px-1.5 py-1' : 'text-[10px] px-2 py-1.5'} text-[var(--color-text-secondary)] border-b border-[var(--color-border-primary)]/40 align-top`}
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

export const SectionDivider = ({ label, accent = 'var(--color-accent-cyan)' }) => (
  <div className="flex items-center gap-3 my-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.35em] whitespace-nowrap" style={{ color: accent }}>
      ◤ {label}
    </span>
    <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, currentColor, transparent)', color: accent, opacity: 0.4 }} />
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
