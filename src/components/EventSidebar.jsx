import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, ChevronDown, ChevronUp, Filter, Trash2, 
  Download, Eye, EyeOff, Check, CheckSquare,
  Square, AlertTriangle, AlertCircle, Info,
  MapPin, Clock, Globe, Search, Zap
} from 'lucide-react'
import { useEvents } from '../context/EventContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { formatTimestamp, getSeverityColor, getSeverityLabel } from '../utils/helpers.js'
import { SEVERITY_LEVELS, EVENT_CATEGORIES } from '../utils/constants.js'

const EventSidebar = ({ onClose }) => {
  const { 
    events, 
    activeEvent, 
    selectedEvents, 
    filters, 
    stats,
    getFilteredEvents,
    selectEvent,
    toggleEventSelection,
    selectAllVisible,
    clearSelection,
    setFilter,
    clearFilters,
    exportEvents
  } = useEvents()
  
  const { panelWidths, setPanelWidth } = useUI()
  const { activeLayers } = useMapLayers()
  
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' })
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEvent, setExpandedEvent] = useState(null)
  const dragRef = useRef(null)

  const filteredEvents = useMemo(() => {
    let result = getFilteredEvents()
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.type.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.source.toLowerCase().includes(query) ||
        (e.countryCode && e.countryCode.toLowerCase().includes(query))
      )
    }
    
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]
      
      if (sortConfig.key === 'timestamp') {
        aVal = a.timestamp
        bVal = b.timestamp
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    
    return result
  }, [getFilteredEvents, searchQuery, sortConfig])

  const handleResize = (e) => {
    if (!dragRef.current) return
    const startX = e.clientX
    const startWidth = panelWidths.right
    
    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX
      setPanelWidth('right', startWidth - delta)
    }
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getCategoryInfo = (category) => {
    return EVENT_CATEGORIES.find(c => c.id === category) || { label: category, icon: 'HelpCircle' }
  }

  const SeverityBadge = ({ severity }) => {
    const color = getSeverityColor(severity)
    const label = getSeverityLabel(severity)
    return (
      <motion.span
        className="px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider"
        style={{ 
          background: `${color}22`, 
          color: color,
          border: `1px solid ${color}44`
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {label}
      </motion.span>
    )
  }

  return (
    <motion.div
      ref={dragRef}
      className="fixed right-0 top-14 bottom-12 z-30 panel-glass border-l border-[var(--color-border-primary)] flex flex-col transition-all duration-300 pointer-events-auto max-h-[calc(100vh-120px)] overflow-hidden"
      style={{ 
        width: panelWidths.right,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.02)'
      }}
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--color-accent-amber)]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)]">
            EVENT FEED
          </span>
          <span className="px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] rounded">
            {filteredEvents.length} / {stats.total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-tactical p-1.5"
            onClick={() => exportEvents('json')}
            title="Export JSON"
            aria-label="Export as JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            className="btn-tactical p-1.5"
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
            aria-label="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            className="btn-tactical p-1.5"
            onClick={clearSelection}
            title="Clear Selection"
            aria-label="Clear selection"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            className="btn-tactical p-1.5"
            onClick={onClose}
            title="Close Panel"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="popLayout">
          {showFilters && (
            <motion.div
              className="p-3 border-b border-[var(--color-border-primary)] space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-tactical flex-1 py-1.5 text-xs"
                />
              </div>
              
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">SEVERITY</div>
                <div className="flex flex-wrap gap-1">
                  {SEVERITY_LEVELS.map(s => (
                    <label key={s.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.severity.includes(s.id)}
                        onChange={(e) => {
                          const newSeverity = e.target.checked 
                            ? [...filters.severity, s.id]
                            : filters.severity.filter(x => x !== s.id)
                          setFilter('severity', newSeverity)
                        }}
                        className="sr-only peer"
                      />
                      <span className="px-2 py-1 rounded text-[10px] font-mono uppercase transition-all"
                        style={{
                          background: filters.severity.includes(s.id) ? `${s.color}22` : 'var(--color-bg-tertiary)',
                          color: filters.severity.includes(s.id) ? s.color : 'var(--color-text-muted)',
                          border: `1px solid ${filters.severity.includes(s.id) ? s.color : 'var(--color-border-primary)'}`
                        }}
                      >
                        {s.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">CATEGORIES</div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {EVENT_CATEGORIES.map(c => (
                    <label key={c.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(c.id)}
                        onChange={(e) => {
                          const newCats = e.target.checked 
                            ? [...filters.categories, c.id]
                            : filters.categories.filter(x => x !== c.id)
                          setFilter('categories', newCats)
                        }}
                        className="sr-only peer"
                      />
                      <span className="px-2 py-1 rounded text-[10px] font-mono transition-all"
                        style={{
                          background: filters.categories.includes(c.id) ? 'var(--color-border-glow)' : 'var(--color-bg-tertiary)',
                          color: filters.categories.includes(c.id) ? 'var(--color-accent-emerald)' : 'var(--color-text-secondary)',
                          border: `1px solid ${filters.categories.includes(c.id) ? 'var(--color-accent-emerald)' : 'var(--color-border-primary)'}`
                        }}
                      >
                        {c.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn-tactical text-xs flex-1 justify-center"
                  onClick={clearFilters}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  CLEAR ALL FILTERS
                </button>
                <button
                  className="btn-tactical text-xs flex-1 justify-center"
                  onClick={() => selectAllVisible()}
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  SELECT ALL VISIBLE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <AnimatePresence mode="popLayout">
            {filteredEvents.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center h-full p-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AlertTriangle className="w-12 h-12 text-[var(--color-text-muted)] opacity-50 mb-4" />
                <p className="font-mono text-sm text-[var(--color-text-muted)]">NO EVENTS MATCH FILTERS</p>
                <p className="font-mono text-[10px] text-[var(--color-text-muted)] mt-1">Adjust filters or check data feeds</p>
              </motion.div>
            ) : (
              <motion.ul className="divide-y divide-[var(--color-border-primary)]">
                {filteredEvents.map((event, index) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    index={index}
                    isActive={activeEvent?.id === event.id}
                    isSelected={selectedEvents.has(event.id)}
                    onClick={() => selectEvent(event.id)}
                    onToggleSelect={() => toggleEventSelection(event.id)}
                    onExpand={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    isExpanded={expandedEvent === event.id}
                    getCategoryInfo={getCategoryInfo}
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between text-[var(--color-text-muted)] font-mono text-[10px]">
          <span>LAST UPDATE: {formatTimestamp(Date.now(), { short: true })}</span>
          <span>{stats.critical} CRITICAL · {stats.high} HIGH · {stats.medium} MED · {stats.info} INFO</span>
        </div>
      </div>

      <div 
        className="w-1 cursor-col-resize absolute left-0 top-0 bottom-0"
        style={{ background: 'linear-gradient(180deg, transparent, var(--color-border-primary), transparent)' }}
        onMouseDown={handleResize}
        aria-label="Resize panel"
        role="slider"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPanelWidth('right', panelWidths.right + 20)
          if (e.key === 'ArrowRight') setPanelWidth('right', panelWidths.right - 20)
        }}
      />
    </motion.div>
  )
}

const EventItem = ({ 
  event, 
  index, 
  isActive, 
  isSelected, 
  onClick, 
  onToggleSelect, 
  onExpand, 
  isExpanded,
  getCategoryInfo
}) => {
  const color = getSeverityColor(event.severity)
  const categoryInfo = getCategoryInfo(event.category)
  const timeAgo = formatTimestamp(event.timestamp, { relative: true })
  
  return (
    <motion.li
      className="relative"
      style={{ 
        background: isActive ? `${color}10` : index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        className="w-full p-3 text-left flex items-start gap-3"
        onClick={onClick}
        style={{ borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent' }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 mt-0.5 accent-[var(--color-accent-emerald)] flex-shrink-0"
          aria-label="Select event"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-[var(--color-text-primary)] truncate">{event.title}</span>
                <SeverityBadge severity={event.severity} />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] font-mono">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.countryCode || 'INTL'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {categoryInfo.label}
                </span>
              </div>
            </div>
            <button
              className="p-1 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onExpand() }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="px-6 pb-3 border-l border-[var(--color-border-primary)] ml-7"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-2 gap-3 pt-3 font-mono text-xs">
              <div>
                <span className="text-[var(--color-text-muted)]">SOURCE</span>
                <div className="text-[var(--color-text-primary)]">{event.source}</div>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">TYPE</span>
                <div className="text-[var(--color-text-primary)]">{event.type}</div>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">COORDINATES</span>
                <div className="text-[var(--color-text-primary)]">{event.geo === false || event.lat == null ? 'GLOBAL (no geolocation)' : `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}`}</div>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">TIMESTAMP</span>
                <div className="text-[var(--color-text-primary)]">{formatTimestamp(event.timestamp)}</div>
              </div>
            </div>
            {Object.keys(event.details).length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">DETAILS</span>
                <div className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
                  {Object.entries(event.details).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-[var(--color-text-muted)]">{k}:</span>
                      <span>{typeof v === 'object' ? JSON.stringify(v) : v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

const SeverityBadge = ({ severity }) => {
  const color = getSeverityColor(severity)
  const label = getSeverityLabel(severity)
  return (
    <span className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider"
      style={{ 
        background: `${color}22`, 
        color: color,
        border: `1px solid ${color}44`
      }}
    >
      {label}
    </span>
  )
}

export default EventSidebar