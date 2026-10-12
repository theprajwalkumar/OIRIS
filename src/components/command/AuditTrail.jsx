import React from 'react'
import { ScrollText } from 'lucide-react'
import { useOntology } from '../../context/OntologyContext.jsx'
import { timeAgo } from '../dashboard/ui.jsx'

const ACTOR_COLOR = { OPERATOR: '#00d4ff', AIP: '#b84dff', SYSTEM: '#64748b' }

const AuditTrail = ({ maxHeight }) => {
  const { auditEntries } = useOntology()

  return (
    <div className="flex flex-col min-h-0" style={{ maxHeight }}>
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[var(--color-border-primary)] shrink-0">
        <ScrollText className="w-3.5 h-3.5 text-[var(--color-accent-violet)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-primary)]">Immutable Audit Trail</span>
        <span className="ml-auto font-mono text-[9px] text-[var(--color-text-muted)]">{auditEntries.length} ENTRIES</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {auditEntries.length === 0 && (
          <div className="p-6 text-center font-mono text-[10px] text-[var(--color-text-muted)]">
            NO AUDIT ENTRIES · ACTIONS ARE LOGGED IMMUTABLY
          </div>
        )}
        {auditEntries.map((e) => {
          const color = ACTOR_COLOR[e.actor] || '#64748b'
          return (
            <div key={e.id} className="px-2.5 py-1.5 border-b border-[var(--color-border-primary)]/40">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[8px] px-1 py-0.5 rounded-sm uppercase tracking-wider shrink-0"
                  style={{ color, background: `${color}1a`, border: `1px solid ${color}33` }}
                >{e.actor}</span>
                <span className="font-mono text-[10px] text-[var(--color-text-primary)] truncate">{e.action}</span>
                <span className="ml-auto font-mono text-[8px] text-[var(--color-text-muted)] shrink-0">{timeAgo(e.ts)}</span>
              </div>
              {(e.detail || e.target) && (
                <div className="font-mono text-[9px] text-[var(--color-text-muted)] mt-0.5 break-words">
                  {e.target && <span className="text-[var(--color-text-secondary)]">{e.target}</span>}
                  {e.target && e.detail ? ' · ' : ''}
                  {e.detail}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AuditTrail
