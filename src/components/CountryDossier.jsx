import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, ChevronDown, ChevronUp, MapPin, Clock, AlertTriangle, 
  TrendingUp, TrendingDown, Activity, Users, Shield, 
  Globe, Zap, Radio, Ship, Plane, Waves, BarChart2,
  ExternalLink, Copy, Download
} from 'lucide-react'
import { useEvents } from '../context/EventContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { formatTimestamp, getSeverityColor, getCountryName, calculateDistance } from '../utils/helpers.js'
import { SEVERITY_LEVELS, CII_WEIGHTS, CII_THRESHOLDS } from '../utils/constants.js'

const CountryDossier = ({ onClose }) => {
  const { events, getEventsByCountry, getFilteredEvents } = useEvents()
  const { activeLayers } = useMapLayers()
  const { panelWidths, setPanelWidth } = useUI()
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [timeRange, setTimeRange] = useState('24h')
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    events: true,
    instability: true,
    infrastructure: true,
    cyber: true
  })
  const dragRef = useRef(null)

  const countries = useMemo(() => {
    const countryMap = new Map()
    events.forEach(event => {
      if (event.countryCode) {
        const existing = countryMap.get(event.countryCode) || { 
          code: event.countryCode, 
          events: [], 
          severityCounts: { critical: 0, high: 0, medium: 0, info: 0 },
          categories: new Set(),
          lastUpdate: 0
        }
        existing.events.push(event)
        existing.severityCounts[event.severity]++
        existing.categories.add(event.category)
        existing.lastUpdate = Math.max(existing.lastUpdate, event.timestamp)
        countryMap.set(event.countryCode, existing)
      }
    })
    return Array.from(countryMap.values())
      .sort((a, b) => b.severityCounts.critical - a.severityCounts.critical || b.events.length - a.events.length)
  }, [events])

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

  const selectCountry = (countryCode) => {
    setSelectedCountry(countryCode)
  }

  const getCountryEvents = (countryCode) => {
    return getEventsByCountry(countryCode)
  }

  const calculateCII = (countryCode) => {
    const countryEvents = getCountryEvents(countryCode)
    if (countryEvents.length === 0) return { score: 0, level: 'stable', factors: {} }

    const now = Date.now()
    const dayMs = 86400000
    const recentEvents = countryEvents.filter(e => now - e.timestamp < dayMs * 7)
    
    const conflictEvents = recentEvents.filter(e => e.category === 'conflict' || e.type === 'conflict')
    const unrestEvents = recentEvents.filter(e => e.category === 'unrest' || e.type === 'unrest')
    const infraEvents = recentEvents.filter(e => e.category === 'internet-outage')
    
    const conflictDensity = Math.min(1, conflictEvents.length / 10)
    const newsVelocity = Math.min(1, recentEvents.length / 50)
    const ewActivity = 0
    const economicStress = Math.min(1, infraEvents.length / 10)
    const socialUnrest = Math.min(1, unrestEvents.length / 10)
    
    const factors = { conflictDensity, newsVelocity, ewActivity, economicStress, socialUnrest }
    const score = Object.entries(factors).reduce((sum, [key, value]) => 
      sum + value * (CII_WEIGHTS[key] || 0), 0)
    
    let level = 'stable'
    if (score >= CII_THRESHOLDS.critical) level = 'critical'
    else if (score >= CII_THRESHOLDS.high) level = 'high'
    else if (score >= CII_THRESHOLDS.elevated) level = 'elevated'
    
    return { score, level, factors, recentCount: recentEvents.length }
  }

  const dossier = useMemo(() => {
    if (!selectedCountry) return null
    const countryEvents = getCountryEvents(selectedCountry)
    const cii = calculateCII(selectedCountry)
    const now = Date.now()
    const dayMs = 86400000
    
    const rangeMs = timeRange === '1h' ? 3600000 : timeRange === '6h' ? 21600000 : timeRange === '24h' ? dayMs : dayMs * 7
    const recentEvents = countryEvents.filter(e => now - e.timestamp < rangeMs)
    
    const byCategory = {}
    recentEvents.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1
    })
    
    const bySeverity = {}
    recentEvents.forEach(e => {
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1
    })
    
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').slice(0, 5)
    const latestEvents = [...recentEvents].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
    
    return {
      code: selectedCountry,
      name: getCountryName(selectedCountry),
      cii,
      totalEvents: countryEvents.length,
      recentEvents: recentEvents.length,
      byCategory,
      bySeverity,
      criticalEvents,
      latestEvents,
      lastUpdate: Math.max(...countryEvents.map(e => e.timestamp), 0)
    }
  }, [selectedCountry, timeRange, getCountryEvents])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (!selectedCountry) {
    return (
      <motion.div
        className="fixed right-0 top-14 bottom-12 z-30 panel-glass border-l border-[var(--color-border-primary)] flex flex-col pointer-events-auto max-h-[calc(100vh-120px)] overflow-hidden"
        style={{ width: panelWidths.right }}
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
      >
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-primary)]">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-accent-cyan)]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)]">
              COUNTRY DOSSIER
            </span>
          </div>
          <button className="btn-tactical p-1.5" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">
              SELECT COUNTRY
            </label>
            <input
              type="text"
              placeholder="Search country (ISO code or name)..."
              className="input-tactical mb-4"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
              {countries.map(country => (
                <button
                  key={country.code}
                  className="btn-tactical text-left p-2 justify-start gap-2 text-xs"
                  onClick={() => selectCountry(country.code)}
                  style={{ 
                    borderColor: country.severityCounts.critical > 0 ? 'var(--color-accent-crimson)' : 
                                 country.severityCounts.high > 0 ? 'var(--color-accent-amber)' : 'var(--color-border-primary)'
                  }}
                >
                  <span className="font-mono text-[var(--color-text-primary)] w-10">{country.code}</span>
                  <span className="text-[var(--color-text-secondary)] truncate">{getCountryName(country.code)}</span>
                  <span className="ml-auto font-mono text-[10px] text-[var(--color-accent-crimson)]">
                    {country.severityCounts.critical}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t border-[var(--color-border-primary)]">
            <p className="font-mono text-[10px] text-[var(--color-text-muted)] text-center">
              {countries.length} COUNTRIES WITH ACTIVE EVENTS
            </p>
          </div>
        </div>

        <div 
          className="w-1 cursor-col-resize absolute left-0 top-0 bottom-0"
          style={{ background: 'linear-gradient(180deg, transparent, var(--color-border-primary), transparent)' }}
          onMouseDown={handleResize}
          aria-label="Resize panel"
        />
      </motion.div>
    )
  }

  const ciiColor = 
    dossier.cii.level === 'critical' ? '#ff3355' :
    dossier.cii.level === 'high' ? '#ffb800' :
    dossier.cii.level === 'elevated' ? '#00d4ff' : '#00ff88'

  return (
    <motion.div
      ref={dragRef}
      className="fixed right-0 top-14 bottom-12 z-30 panel-glass border-l border-[var(--color-border-primary)] flex flex-col pointer-events-auto max-h-[calc(100vh-120px)] overflow-hidden"
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
          <Globe className="w-5 h-5" style={{ color: ciiColor }} />
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)]">
              {dossier.code} — {dossier.name}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
              CII: {dossier.cii.level.toUpperCase()} · {dossier.recentEvents} EVENTS ({timeRange})
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-tactical py-1 px-2 text-xs w-auto"
          >
            <option value="1h">1 HOUR</option>
            <option value="6h">6 HOURS</option>
            <option value="24h">24 HOURS</option>
            <option value="7d">7 DAYS</option>
          </select>
          <button className="btn-tactical p-1.5" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="popLayout">
          {expandedSections.overview && (
            <motion.div
              key="overview"
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SectionHeader title="OVERVIEW" icon={Activity} onToggle={() => toggleSection('overview')} isOpen={expandedSections.overview} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MetricCard label="TOTAL EVENTS" value={dossier.totalEvents} icon={Activity} />
                <MetricCard label="RECENT EVENTS" value={dossier.recentEvents} icon={Clock} />
                <MetricCard label="CRITICAL" value={dossier.bySeverity.critical || 0} icon={AlertTriangle} color="#ff3355" />
                <MetricCard label="LAST UPDATE" value={formatTimestamp(dossier.lastUpdate, { relative: true })} icon={Clock} />
              </div>
            </motion.div>
          )}

          {expandedSections.instability && (
            <motion.div
              key="instability"
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SectionHeader title="INSTABILITY INDEX (CII)" icon={TrendingUp} onToggle={() => toggleSection('instability')} isOpen={expandedSections.instability} />
              <div className="mt-3">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-muted)]">COMPOSITE SCORE</span>
                    <span className="font-mono text-lg" style={{ color: ciiColor }}>{(dossier.cii.score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${dossier.cii.score * 100}%`,
                        background: `linear-gradient(90deg, #00ff88, #00d4ff, #ffb800, #ff3355)`
                      }}
                      initial={{ width: 0 }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                    <span>STABLE</span>
                    <span className="font-mono text-sm" style={{ color: ciiColor }}>{dossier.cii.level.toUpperCase()}</span>
                    <span>CRITICAL</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(dossier.cii.factors).map(([key, value]) => (
                    <div key={key} className="panel-glass p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                          {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                        </span>
                        <span className="font-mono text-sm" style={{ color: value > 0.7 ? '#ff3355' : value > 0.4 ? '#ffb800' : '#00ff88' }}>
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${value * 100}%`,
                            background: value > 0.7 ? '#ff3355' : value > 0.4 ? '#ffb800' : '#00ff88'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {expandedSections.events && (
            <motion.div
              key="events"
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SectionHeader title="RECENT EVENTS" icon={Clock} onToggle={() => toggleSection('events')} isOpen={expandedSections.events} />
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {dossier.latestEvents.map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </motion.div>
          )}

          {expandedSections.infrastructure && (
            <motion.div
              key="infrastructure"
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SectionHeader title="INFRASTRUCTURE" icon={Zap} onToggle={() => toggleSection('infrastructure')} isOpen={expandedSections.infrastructure} />
              <div className="mt-3 space-y-2">
                {Object.entries(dossier.byCategory)
                  .filter(([cat]) => ['internet-outage', 'satellite', 'aviation-weather'].includes(cat))
                  .map(([cat, count]) => (
                    <CategoryRow key={cat} category={cat} count={count} />
                  ))}
              </div>
            </motion.div>
          )}

          {expandedSections.cyber && (
            <motion.div
              key="cyber"
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SectionHeader title="CYBER THREATS" icon={Shield} onToggle={() => toggleSection('cyber')} isOpen={expandedSections.cyber} />
              <div className="mt-3 space-y-2">
                {Object.entries(dossier.byCategory)
                  .filter(([cat]) => ['c2', 'phishing', 'malware', 'cisa-kev'].includes(cat))
                  .map(([cat, count]) => (
                    <CategoryRow key={cat} category={cat} count={count} />
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center justify-between text-[var(--color-text-muted)] font-mono text-[10px]">
          <span>CII WEIGHTS: CONFLICT 35% · NEWS 25% · EW 20% · ECON 10% · SOCIAL 10%</span>
        </div>
      </div>

      <div 
        className="w-1 cursor-col-resize absolute left-0 top-0 bottom-0"
        style={{ background: 'linear-gradient(180deg, transparent, var(--color-border-primary), transparent)' }}
        onMouseDown={handleResize}
        aria-label="Resize panel"
      />
    </motion.div>
  )
}

const SectionHeader = ({ title, icon: Icon, onToggle, isOpen }) => (
  <button className="w-full flex items-center justify-between p-2 rounded-lg transition-colors" onClick={onToggle}>
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-[var(--color-accent-cyan)]" />
      <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)]">{title}</span>
    </div>
    <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
      <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
    </motion.span>
  </button>
)

const MetricCard = ({ label, value, icon: Icon, color = '#00d4ff' }) => (
  <div className="panel-glass p-3 rounded-lg">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
    </div>
    <div className="font-mono text-lg" style={{ color }}>{value}</div>
  </div>
)

const EventRow = ({ event }) => {
  const color = getSeverityColor(event.severity)
  return (
    <div className="panel-glass p-2 rounded flex items-center gap-2" style={{ borderLeft: `3px solid ${color}` }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs text-[var(--color-text-primary)] truncate">{event.title}</div>
        <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{formatTimestamp(event.timestamp, { relative: true })} · {event.category}</div>
      </div>
      <span className="px-1.5 py-0.5 font-mono text-[9px] uppercase" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 2 }}>
        {event.severity.toUpperCase()}
      </span>
    </div>
  )
}

const CategoryRow = ({ category, count }) => {
  const colors = {
    'internet-outage': '#ffb800', satellite: '#b84dff', 'aviation-weather': '#00d4ff',
    c2: '#ff3355', phishing: '#ffb800', malware: '#00d4ff', 'cisa-kev': '#ff3355'
  }
  const color = colors[category] || '#00d4ff'
  const label = category.replace(/-/g, ' ').toUpperCase()
  return (
    <div className="flex items-center justify-between p-2 panel-glass rounded">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <span className="font-mono text-sm" style={{ color }}>{count}</span>
    </div>
  )
}

export default CountryDossier