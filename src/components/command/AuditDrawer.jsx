import React from 'react'
import { X } from 'lucide-react'
import { useOntology } from '../../context/OntologyContext.jsx'
import AuditTrail from './AuditTrail.jsx'

const AuditDrawer = ({ open, onClose }) => {
  const { stats } = useOntology()
  if (!open) return null
  return (
    <aside className="fixed left-0 top-0 h-full w-[360px] max-w-[92vw] z-[1100] panel-glass border-r border-[var(--color-border-glow)] flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-primary)] bg-black/40 shrink-0">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-primary)]">Human-in-the-Loop · Accountability</div>
        <button className="btn-tactical p-1.5 ml-auto" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button>
      </header>
      <AuditTrail />
      <div className="shrink-0 border-t border-[var(--color-border-primary)] px-3 py-2">
        <div className="font-mono text-[9px] text-[var(--color-text-muted)]">
          Append-only · {stats.total} objects tracked · no delete/update API
        </div>
      </div>
    </aside>
  )
}

export default AuditDrawer
