import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Command, X, ChevronRight, Globe, Plane, Ship, 
  Shield, Anchor, Waves, AlertTriangle, Zap,
  Radio, MapPin, Search, Keyboard, ExternalLink,
  Copy, Eye, EyeOff, Layers, Filter, Share2, Crosshair, Bot, ScrollText
} from 'lucide-react'
import { useCommandPalette } from '../hooks/useCommandPalette.js'
import { useEvents } from '../context/EventContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useOntology } from '../context/OntologyContext.jsx'
import { formatTimestamp, getSeverityColor, getCountryName } from '../utils/helpers.js'

const ICON_MAP = {
  event: Zap,
  layer: Layers,
  country: Globe,
  default: Command
}

const CommandPalette = ({ isOpen, onClose }) => {
  const { 
    query, 
    setQuery, 
    results, 
    selectedIndex, 
    search, 
    selectResult, 
    navigate,
    toggle
  } = useCommandPalette()
  
  const { events, getFilteredEvents } = useEvents()
  const { activeLayers, toggleLayer, layerGroups } = useMapLayers()
  const { toggleSidebar, sidebars } = useUI()
  const { toggleSuite } = useOntology()
  
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.addEventListener('keydown', handleGlobalKeyDown)
    }
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen])

  useEffect(() => {
    search(query)
  }, [query, search])

  const handleGlobalKeyDown = (e) => {
    if (!isOpen) return
    
    if (e.key === 'Escape') {
      onClose()
      return
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      navigate(1)
      scrollToSelected()
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      navigate(-1)
      scrollToSelected()
    }
    
    if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        selectResult(selectedIndex)
      }
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      onClose()
    }
  }

  const scrollToSelected = () => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]')
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' })
      }
    }
  }

  const getResultIcon = (type) => {
    const Icon = ICON_MAP[type] || ICON_MAP.default
    return <Icon className="w-4 h-4" />
  }

  const getResultColor = (type, item) => {
    if (type === 'event') {
      return getSeverityColor(item.severity || 'info')
    }
    if (type === 'layer') {
      const group = Object.values(layerGroups).find(g => 
        g.layers.some(l => l.id === item.id.replace('layer-', ''))
      )
      return group?.color || '#00d4ff'
    }
    if (type === 'country') {
      return '#00d4ff'
    }
    return '#00ff88'
  }

  if (!isOpen) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-2xl panel-glass border border-[var(--color-border-glow)] rounded-lg overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.2)' }}
        initial={{ y: -20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -20, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00d4ff22, #b84dff22)' }}>
            <Command className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, layers, countries... (Cmd+K to close)"
            className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] font-mono text-[10px]">
            <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-primary)]">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-primary)]">↓</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-primary)]">⏎</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-primary)]">⎋</kbd>
          </div>
          <button className="btn-tactical p-1.5" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {results.length === 0 && query.length > 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-[var(--color-text-muted)] opacity-50 mb-3" />
              <p className="font-mono text-sm text-[var(--color-text-muted)]">NO RESULTS FOR "{query}"</p>
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] mt-1">Try different keywords or check active layers</p>
            </div>
          )}

          {results.length === 0 && query.length === 0 && (
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-3 px-2">QUICK ACTIONS</div>
              <QuickAction 
                label="OPEN EVENT FEED" 
                desc="Toggle event sidebar panel"
                icon={Zap}
                onClick={() => { toggleSidebar('events', true); onClose(); }}
              />
              <QuickAction 
                label="OPEN COUNTRY DOSSIER" 
                desc="View country instability index"
                icon={Globe}
                onClick={() => { toggleSidebar('dossier', true); onClose(); }}
              />
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mt-4 mb-2 px-2">COMMAND SUITE</div>
              <QuickAction
                label="OPEN OBJECT EXPLORER"
                desc="Gotham-style entity graph & object fusion"
                icon={Share2}
                onClick={() => { toggleSuite('explorer', true); onClose(); }}
              />
              <QuickAction
                label="TOGGLE TARGETING HUD"
                desc="Classification boxes & sensor pairing"
                icon={Crosshair}
                onClick={() => { toggleSuite('targeting'); onClose(); }}
              />
              <QuickAction
                label="OPEN AIP ASSISTANT"
                desc="Analyst terminal + audit trail"
                icon={Bot}
                onClick={() => { toggleSuite('aip', true); onClose(); }}
              />
              <QuickAction
                label="OPEN AUDIT TRAIL"
                desc="Immutable human-in-the-loop log"
                icon={ScrollText}
                onClick={() => { toggleSuite('audit', true); onClose(); }}
              />
              <QuickAction 
                label="ENABLE ALL LAYERS" 
                desc="Activate all map overlays"
                icon={Eye}
                onClick={() => { 
                  Object.values(layerGroups).forEach(g => g.layers.forEach(l => toggleLayer(l.id)))
                  onClose()
                }}
              />
              <QuickAction 
                label="RESET TO DEFAULTS" 
                desc="Restore default layer configuration"
                icon={Filter}
                onClick={() => { onClose(); }}
              />
              <QuickAction 
                label="TOGGLE FULLSCREEN" 
                desc="Enter fullscreen mode (Cmd+Shift+F)"
                icon={ExternalLink}
                onClick={() => { onClose(); }}
              />
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="px-4 py-2 border-b border-[var(--color-border-primary)]">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                </div>
              </div>
              <ul className="divide-y divide-[var(--color-border-primary)]">
                {results.map((item, index) => (
                  <motion.li
                    key={item.id}
                    data-selected={index === selectedIndex}
                    className="relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <button
                      className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors"
                      style={{ 
                        background: index === selectedIndex ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(184,77,255,0.1))' : 'transparent'
                      }}
                      onClick={() => selectResult(index)}
                      onMouseEnter={() => navigate(index - selectedIndex)}
                    >
                      <div 
                        className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ 
                          background: `linear-gradient(135deg, ${getResultColor(item.type, item)}22, ${getResultColor(item.type, item)}44)`,
                          border: index === selectedIndex ? `1px solid ${getResultColor(item.type, item)}` : '1px solid transparent'
                        }}
                      >
                        {getResultIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[var(--color-text-primary)] truncate">{item.title}</span>
                          {item.severity && (
                            <span className="px-1.5 py-0.5 font-mono text-[9px] uppercase rounded" 
                              style={{ 
                                background: `${getSeverityColor(item.severity)}22`, 
                                color: getSeverityColor(item.severity),
                                border: `1px solid ${getSeverityColor(item.severity)}44`
                              }}
                            >
                              {item.severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate">{item.subtitle}</div>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                        <ChevronRight className="w-4 h-4" />
                        {item.type === 'event' && (
                          <span className="font-mono text-[10px]">{formatTimestamp(item.timestamp || Date.now(), { relative: true })}</span>
                        )}
                      </div>
                    </button>
                    {index === selectedIndex && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: getResultColor(item.type, item) }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                      />
                    )}
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="p-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-text-muted)]">
            <span>{results.length} matches</span>
            <span>Type to search · Enter to select · Esc to close</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

const QuickAction = ({ label, desc, icon: Icon, onClick }) => (
  <button
    className="w-full btn-tactical justify-start gap-3 p-3"
    onClick={onClick}
  >
    <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
      <Icon className="w-4 h-4 text-[var(--color-accent-cyan)]" />
    </div>
    <div className="flex-1 text-left">
      <div className="font-mono text-xs text-[var(--color-text-primary)]">{label}</div>
      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{desc}</div>
    </div>
    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
  </button>
)

export default CommandPalette