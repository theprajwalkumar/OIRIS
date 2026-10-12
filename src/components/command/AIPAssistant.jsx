import React, { useRef, useState, useEffect } from 'react'
import { X, Send, Bot, ScrollText, Terminal, Fingerprint } from 'lucide-react'
import { useOntology } from '../../context/OntologyContext.jsx'
import { interpret, SUGGESTIONS } from '../../services/aipEngine.js'
import { classificationColor } from '../../utils/constants.js'
import AuditTrail from './AuditTrail.jsx'

const WELCOME = {
  role: 'assistant',
  text: 'AIP ANALYST online. Local rule-based reasoning over the live ontology — no cloud LLM.\nTry "threat summary", "how many military aircraft", or "task sensor at 28.61, 77.20".',
  entities: []
}

const AIPAssistant = ({ open, onClose }) => {
  const { entities, stats, setSelectedEntity, classify, taskSensor, logAudit, auditEntries, toggleSuite } = useOntology()
  const [tab, setTab] = useState('assistant')
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, tab])

  if (!open) return null

  const submit = (prompt) => {
    const q = prompt.trim()
    if (!q) return
    logAudit({ actor: 'AIP', action: 'QUERY', detail: q })
    const result = interpret(q, { entities, stats })
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: q },
      { role: 'assistant', text: result.answer, entities: result.entities || [] }
    ])
    logAudit({ actor: 'AIP', action: 'INSIGHT', detail: `${result.kind}: ${result.answer.split('\n')[0]}` })

    if (result.action?.type === 'taskSensor') {
      taskSensor(result.action.payload)
    } else if (result.action?.type === 'classify') {
      const { id, classification, label } = result.action.payload
      classify(id, classification, label)
    }
    setInput('')
  }

  return (
    <aside className="fixed top-0 right-0 h-full w-[384px] max-w-[92vw] z-[1100] panel-glass border-l border-[var(--color-border-glow)] flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-primary)] bg-black/40 shrink-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#b84dff22,#00d4ff22)', border: '1px solid #b84dff44' }}>
          <Bot className="w-4 h-4 text-[var(--color-accent-violet)]" />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-primary)] leading-none">AIP ASSISTANT</div>
          <div className="font-mono text-[8px] text-[var(--color-text-muted)] leading-none mt-0.5">LOCAL RULE-BASED ANALYST · NO CLOUD LLM</div>
        </div>
        <button className="btn-tactical p-1.5 ml-auto" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button>
      </header>

      <div className="flex border-b border-[var(--color-border-primary)] shrink-0">
        <TabButton active={tab === 'assistant'} onClick={() => setTab('assistant')} icon={Terminal} label="ANALYST" />
        <TabButton active={tab === 'audit'} onClick={() => setTab('audit')} icon={ScrollText} label={`AUDIT ·${auditEntries.length}`} />
      </div>

      {tab === 'assistant' && (
        <>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} onFocus={(id) => { setSelectedEntity(id); }} />)}
          </div>
          <div className="shrink-0 border-t border-[var(--color-border-primary)] p-2">
            <div className="flex flex-wrap gap-1 mb-1.5">
              {SUGGESTIONS.slice(0, 5).map((s) => (
                <button key={s} onClick={() => submit(s)} className="px-1.5 py-0.5 rounded-sm font-mono text-[8px] uppercase tracking-wider border border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-violet)] hover:text-[var(--color-accent-violet)] transition-colors">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 input-tactical flex-1">
                <Fingerprint className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(input) }}
                  placeholder="Query the picture…"
                  className="flex-1 bg-transparent outline-none font-mono text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                />
              </div>
              <button onClick={() => submit(input)} className="btn-tactical p-2" aria-label="Send"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <>
          <AuditTrail />
          <div className="shrink-0 border-t border-[var(--color-border-primary)] p-2">
            <button onClick={() => toggleSuite('audit', true)} className="btn-tactical w-full text-[10px]">OPEN FULL AUDIT DRAWER</button>
          </div>
        </>
      )}
    </aside>
  )
}

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${active ? 'text-[var(--color-accent-violet)] border-b-2 border-[var(--color-accent-violet)]' : 'text-[var(--color-text-muted)] border-b-2 border-transparent hover:text-[var(--color-text-secondary)]'}`}
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
)

const Bubble = ({ msg, onFocus }) => {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-md px-2.5 py-1.5 border ${isUser ? 'border-[var(--color-accent-cyan)]44 bg-[#00d4ff10]' : 'border-[var(--color-border-primary)] bg-black/30'}`}
      >
        <div className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">{isUser ? 'OPERATOR' : 'AIP ANALYST'}</div>
        <div className="font-mono text-[10px] text-[var(--color-text-secondary)] whitespace-pre-line break-words">{msg.text}</div>
        {msg.entities?.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-1.5 pt-1.5 border-t border-[var(--color-border-primary)]/50">
            {msg.entities.slice(0, 6).map((e) => (
              <button key={e.id} onClick={() => onFocus?.(e.id)} className="flex items-center gap-1.5 text-left hover:bg-white/[0.04] rounded-sm px-1 py-0.5 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: classificationColor(e.classification) }} />
                <span className="font-mono text-[9px] text-[var(--color-text-primary)] truncate">{e.label}</span>
                <span className="ml-auto font-mono text-[8px] text-[var(--color-text-muted)] shrink-0">{e.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AIPAssistant
