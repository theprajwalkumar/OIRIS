import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  ChevronLeft, ChevronRight, Minimize2, Maximize2,
  Globe, Zap, Radio, Shield, Users, BarChart2,
  ExternalLink, Copy
} from 'lucide-react'
import { useEvents } from '../context/EventContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { formatTimestamp, getCountryName, getSeverityColor } from '../utils/helpers.js'
import { CII_WEIGHTS, CII_THRESHOLDS } from '../utils/constants.js'

const calculateCII = (country) => {
  const now = Date.now()
  const dayMs = 86400000
  const recentEvents = country.events.filter(e => now - e.timestamp < dayMs * 7)

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

const getLevelColor = (level) => {
  switch (level) {
    case 'critical': return '#ff3355'
    case 'high': return '#ffb800'
    case 'elevated': return '#00d4ff'
    default: return '#00ff88'
  }
}

const getLevelLabel = (level) => {
  const labels = {
    critical: 'CRITICAL',
    high: 'HIGH RISK',
    elevated: 'ELEVATED',
    stable: 'STABLE'
  }
  return labels[level] || 'UNKNOWN'
}

const CIIHUD = () => {
  const { events } = useEvents()
  const { activeLayers } = useMapLayers()
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' })

  const countryData = useMemo(() => {
    const countryMap = new Map()
    
    events.forEach(event => {
      if (!event.countryCode) return
      
      const existing = countryMap.get(event.countryCode) || { 
        code: event.countryCode,
        events: [],
        severityCounts: { critical: 0, high: 0, medium: 0, info: 0 },
        categories: new Set(),
        lastUpdate: 0,
        coords: [event.lat, event.lng]
      }
      
      existing.events.push(event)
      existing.severityCounts[event.severity]++
      existing.categories.add(event.category)
      existing.lastUpdate = Math.max(existing.lastUpdate, event.timestamp)
      countryMap.set(event.countryCode, existing)
    })
    
    return Array.from(countryMap.values())
      .map(country => {
        const cii = calculateCII(country)
        return { ...country, cii }
      })
      .sort((a, b) => {
        if (sortConfig.key === 'score') {
          return sortConfig.direction === 'desc' ? b.cii.score - a.cii.score : a.cii.score - b.cii.score
        }
        if (sortConfig.key === 'events') {
          return sortConfig.direction === 'desc' ? b.events.length - a.events.length : a.events.length - b.events.length
        }
        if (sortConfig.key === 'critical') {
          return sortConfig.direction === 'desc' ? b.severityCounts.critical - a.severityCounts.critical : a.severityCounts.critical - b.severityCounts.critical
        }
        return 0
      })
  }, [events, sortConfig])

  const topCountries = countryData.slice(0, 10)

  return (
    <motion.div
      className="fixed left-4 top-16 z-30 panel-glass border border-[var(--color-border-primary)] rounded-lg pointer-events-auto"
      style={{ 
        width: isExpanded ? 380 : 60,
        boxShadow: '4px 4px 24px rgba(0,0,0,0.4)'
      }}
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      <div className="p-3 border-b border-[var(--color-border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center rounded" style={{ background: 'linear-gradient(135deg, #ff335522, #ffb80022)' }}>
            <TrendingUp className="w-4 h-4 text-[var(--color-accent-crimson)]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)] hidden sm:block">
            INSTABILITY INDEX
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-tactical p-1"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand'}
            aria-label={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {isExpanded && (
          <motion.div
            className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="mb-3">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">SORT BY</label>
              <div className="flex gap-1">
                {[
                  { key: 'score', label: 'CII SCORE' },
                  { key: 'events', label: 'EVENT COUNT' },
                  { key: 'critical', label: 'CRITICAL' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    className="btn-tactical text-[10px] px-2 py-1 flex-1 justify-center"
                    onClick={() => setSortConfig(prev => ({ 
                      key: opt.key, 
                      direction: prev.key === opt.key && prev.direction === 'desc' ? 'asc' : 'desc' 
                    }))}
                    style={{ 
                      borderColor: sortConfig.key === opt.key ? 'var(--color-accent-cyan)' : 'var(--color-border-primary)',
                      color: sortConfig.key === opt.key ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)'
                    }}
                  >
                    {opt.label}
                    {sortConfig.key === opt.key && (
                      <span className="ml-1">{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {topCountries.map((country, index) => (
                <CountryCIIRow 
                  key={country.code}
                  country={country}
                  rank={index + 1}
                  isSelected={selectedCountry === country.code}
                  onClick={() => setSelectedCountry(selectedCountry === country.code ? null : country.code)}
                />
              ))}
            </div>

            {countryData.length > 10 && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)] text-center">
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                  +{countryData.length - 10} MORE COUNTRIES
                </span>
              </div>
            )}

            <AnimatePresence>
              {selectedCountry && (
                <motion.div
                  key="detail"
                  className="mt-4 pt-4 border-t border-[var(--color-border-primary)]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CountryCIIDetail country={countryData.find(c => c.code === selectedCountry)} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const CountryCIIRow = ({ country, rank, isSelected, onClick }) => {
  const color = getLevelColor(country.cii.level)
  const levelLabel = getLevelLabel(country.cii.level)
  
  return (
    <motion.button
      className="w-full p-2 rounded-lg text-left transition-all"
      onClick={onClick}
      style={{ 
        background: isSelected ? `${color}15` : 'transparent',
        border: `1px solid ${isSelected ? color + '44' : 'transparent'}`,
        borderLeft: `3px solid ${color}`
      }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-[var(--color-text-muted)] w-5 text-right">{rank}.</span>
        <span className="font-mono text-xs text-[var(--color-text-primary)] w-12">{country.code}</span>
        <div className="flex-1 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #00ff88, #00d4ff, #ffb800, #ff3355)` }}
            initial={{ width: 0 }}
            animate={{ width: `${country.cii.score * 100}%` }}
            transition={{ duration: 0.5, delay: rank * 0.05 }}
          />
        </div>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ 
          background: `${color}22`, 
          color,
          border: `1px solid ${color}44`
        }}>
          {levelLabel}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 text-[var(--color-text-muted)] font-mono text-[10px]">
        <span>{country.events.length} EVENTS</span>
        <span>{country.cii.recentCount} RECENT</span>
        <span>{country.severityCounts.critical} CRIT</span>
      </div>
    </motion.button>
  )
}

const CountryCIIDetail = ({ country }) => {
  if (!country) return null
  
  const color = getLevelColor(country.cii.level)
  const factorLabels = {
    conflictDensity: 'CONFLICT DENSITY',
    newsVelocity: 'NEWS VELOCITY',
    ewActivity: 'EW ACTIVITY',
    economicStress: 'ECONOMIC STRESS',
    socialUnrest: 'SOCIAL UNREST'
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[var(--color-text-primary)]">{country.code}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ 
            background: `${color}22`, 
            color,
            border: `1px solid ${color}44`
          }}>
            {getLevelLabel(country.cii.level)}
          </span>
        </div>
        <span className="font-mono text-lg" style={{ color }}>{(country.cii.score * 100).toFixed(1)}%</span>
      </div>
      
      <div className="space-y-2">
        {Object.entries(country.cii.factors).map(([key, value]) => (
          <div key={key} className="panel-glass p-2 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                {factorLabels[key]}
              </span>
              <span className="font-mono text-sm" style={{ 
                color: value > 0.7 ? '#ff3355' : value > 0.4 ? '#ffb800' : '#00ff88' 
              }}>
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
      
      <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">TOP CATEGORIES</div>
        <div className="flex flex-wrap gap-1">
          {Array.from(country.categories).slice(0, 6).map(cat => (
            <span 
              key={cat} 
              className="px-2 py-0.5 font-mono text-[9px] rounded"
              style={{ 
                background: 'var(--color-bg-tertiary)', 
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-primary)'
              }}
            >
              {cat.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CIIHUD
