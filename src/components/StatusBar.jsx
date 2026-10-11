import React from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, AlertTriangle, AlertCircle, Info, 
  Ship, Plane, Satellite, Shield, 
  Anchor, Waves, Radio, Globe,
  Eye, EyeOff, Layers, Filter
} from 'lucide-react'
import { useEvents } from '../context/EventContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useWS } from '../context/WSContext.jsx'
import { formatTimestamp } from '../utils/helpers.js'

const StatusBar = () => {
  const { stats: eventStats, filters } = useEvents()
  const { stats: layerStats, activeLayers, layerGroups } = useMapLayers()
  const { status, messageCount, lastMessage } = useWS()

  const activeFilterCount = 
    filters.severity.length + 
    filters.categories.length + 
    filters.countries.length

  const getLayerIcon = (groupId) => {
    const icons = {
      geopolitics: Globe,
      maritime: Ship,
      aviation: Plane,
      infrastructure: Anchor,
      physical: Waves,
      cyber: Shield
    }
    return icons[groupId] || Globe
  }

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 panel-glass border-t border-[var(--color-border-primary)] pointer-events-auto"
      style={{ 
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)'
      }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
    >
      <div className="max-w-full mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)' }}>
              <Zap className="w-3 h-3 text-[var(--color-accent-cyan)]" />
              <span className="font-mono text-[10px] text-[var(--color-accent-cyan)]">{eventStats.total}</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(255,51,85,0.1)', border: '1px solid rgba(255,51,85,0.3)' }}>
              <AlertTriangle className="w-3 h-3 text-[var(--color-accent-crimson)]" />
              <span className="font-mono text-[10px] text-[var(--color-accent-crimson)]">{eventStats.critical}</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.3)' }}>
              <AlertCircle className="w-3 h-3 text-[var(--color-accent-amber)]" />
              <span className="font-mono text-[10px] text-[var(--color-accent-amber)]">{eventStats.high}</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)' }}>
              <Info className="w-3 h-3 text-[var(--color-accent-cyan)]" />
              <span className="font-mono text-[10px] text-[var(--color-accent-cyan)]">{eventStats.medium}</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
              <Info className="w-3 h-3 text-[var(--color-accent-emerald)]" />
              <span className="font-mono text-[10px] text-[var(--color-accent-emerald)]">{eventStats.info}</span>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 ml-4 border-l border-[var(--color-border-primary)] pl-4">
              <Filter className="w-4 h-4 text-[var(--color-accent-amber)]" />
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                {activeFilterCount} ACTIVE FILTER{activeFilterCount !== 1 ? 'S' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4">
            {Object.entries(layerGroups).map(([groupId, group]) => {
              const activeCount = group.layers.filter(l => activeLayers[l.id]).length
              const Icon = getLayerIcon(groupId)
              const isActive = activeCount > 0
              return (
                <div 
                  key={groupId}
                  className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-pointer"
                  style={{ 
                    background: isActive ? `${group.color}15` : 'transparent',
                    border: `1px solid ${isActive ? group.color + '44' : 'var(--color-border-primary)'}`
                  }}
                >
                  <Icon className="w-3 h-3" style={{ color: isActive ? group.color : 'var(--color-text-muted)' }} />
                  <span className="font-mono text-[10px]" style={{ color: isActive ? group.color : 'var(--color-text-muted)' }}>
                    {activeCount}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ 
              background: status === 'connected' ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,85,0.1)',
              border: `1px solid ${status === 'connected' ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,85,0.3)'}`
            }}>
              <div className="w-2 h-2 rounded-full" style={{ 
                background: status === 'connected' ? '#00ff88' : '#ff3355',
                animation: status === 'connected' ? 'pulse 2s ease-in-out infinite' : 'none'
              }} />
              <span className="font-mono text-[10px] uppercase" style={{ 
                color: status === 'connected' ? '#00ff88' : '#ff3355' 
              }}>
                {status.toUpperCase()}
              </span>
            </div>

            {lastMessage && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'rgba(184,77,255,0.1)', border: '1px solid rgba(184,77,255,0.3)' }}>
                <Radio className="w-3 h-3 text-[var(--color-accent-violet)]" />
                <span className="font-mono text-[10px] text-[var(--color-accent-violet)]">
                  LAST: {formatTimestamp(lastMessage.timestamp || Date.now(), { relative: true })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default StatusBar