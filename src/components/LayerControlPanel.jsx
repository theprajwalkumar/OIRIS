import React, { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Ship, Plane, Anchor, Waves, Shield, 
  ChevronDown, ChevronUp, Eye, EyeOff, 
  Maximize2, Minimize2, Layers, Filter,
  RefreshCw, Trash2, Settings
} from 'lucide-react'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { getSeverityColor } from '../utils/helpers.js'

const ICON_MAP = { Globe, Ship, Plane, Anchor, Waves, Shield }

const LayerControlPanel = () => {
  const { 
    layerGroups, 
    activeLayers, 
    groupVisibility, 
    layerOpacity,
    stats,
    toggleLayer, 
    toggleGroup, 
    setOpacity,
    enableAll, 
    disableAll, 
    resetToDefaults,
    isLayerActive,
    isGroupVisible
  } = useMapLayers()
  
  const { panelWidths, setPanelWidth, sidebars, toggleSidebar } = useUI()
  const [expandedGroups, setExpandedGroups] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const dragRef = useRef(null)

  const groups = useMemo(() => Object.values(layerGroups), [layerGroups])

  const handleResize = (e) => {
    if (!dragRef.current) return
    const startX = e.clientX
    const startWidth = panelWidths.left
    
    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX
      setPanelWidth('left', startWidth + delta)
    }
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const getActiveCount = (groupId) => {
    const group = layerGroups[groupId]
    if (!group) return 0
    return group.layers.filter(l => activeLayers[l.id]).length
  }

  const getTotalCount = (groupId) => {
    const group = layerGroups[groupId]
    return group?.layers.length || 0
  }

  const handleKeyDown = (e, layerId) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      toggleLayer(layerId)
    }
  }

  return (
    <motion.div
      ref={dragRef}
      className="fixed left-0 top-14 bottom-12 z-30 panel-glass border-r border-[var(--color-border-primary)] flex flex-col transition-all duration-300 pointer-events-auto max-h-[calc(100vh-120px)] overflow-hidden"
      style={{ 
        width: isCollapsed ? 56 : panelWidths.left,
        boxShadow: '4px 0 24px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.02)'
      }}
      initial={{ x: -400 }}
      animate={{ x: 0 }}
      exit={{ x: -400 }}
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)] hidden sm:block">
            LAYER CONTROL
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-tactical p-1.5"
            onClick={() => setShowStats(!showStats)}
            title="Show Statistics"
            aria-label="Toggle statistics"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            className="btn-tactical p-1.5"
            onClick={resetToDefaults}
            title="Reset to Defaults (R)"
            aria-label="Reset layers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="btn-tactical p-1.5"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title="Collapse Panel"
            aria-label="Collapse panel"
          >
            {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
        {showStats && (
          <motion.div
            className="mb-4 p-3 panel-glass rounded-lg border border-[var(--color-border-glow)]"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">LAYER STATISTICS</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="metric-value text-[var(--color-accent-emerald)]">{stats.active}</div>
                <div className="metric-label">ACTIVE</div>
              </div>
              <div>
                <div className="metric-value text-[var(--color-text-secondary)]">{stats.total}</div>
                <div className="metric-label">TOTAL</div>
              </div>
              <div>
                <div className="metric-value text-[var(--color-accent-cyan)]">{Object.keys(layerGroups).length}</div>
                <div className="metric-label">GROUPS</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
              <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">BY GROUP</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(stats.byGroup).map(([groupId, count]) => (
                  <div key={groupId} className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">{layerGroups[groupId]?.label || groupId}</span>
                    <span className="font-mono text-[var(--color-accent-emerald)]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {!isCollapsed && groups.map(group => (
            <motion.div
              key={group.id}
              className="mb-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <button
                className="w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 group"
                onClick={() => toggleGroup(group.id)}
                style={{ 
                  background: isGroupVisible(group.id) 
                    ? 'linear-gradient(135deg, rgba(30, 58, 95, 0.3) 0%, rgba(17, 24, 39, 0.5) 100%)' 
                    : 'rgba(17, 24, 39, 0.3)',
                  border: `1px solid ${isGroupVisible(group.id) ? 'var(--color-border-glow)' : 'var(--color-border-primary)'}`
                }}
              >
                <div className="flex items-center gap-2">
                  <motion.span
                    className="w-6 h-6 flex items-center justify-center rounded"
                    style={{ background: `linear-gradient(135deg, ${group.color}22, ${group.color}44)` }}
                  >
                    {React.createElement(ICON_MAP[group.icon] || Globe, { className: "w-4 h-4", style: { color: group.color } })}
                  </motion.span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)] truncate">
                      {group.label}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate">
                      {getActiveCount(group.id)} / {getTotalCount(group.id)} active
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ 
                    background: isGroupVisible(group.id) ? `${group.color}22` : 'var(--color-bg-tertiary)',
                    color: isGroupVisible(group.id) ? group.color : 'var(--color-text-muted)',
                    border: `1px solid ${isGroupVisible(group.id) ? group.color : 'transparent'}`
                  }}>
                    {isGroupVisible(group.id) ? 'ON' : 'OFF'}
                  </span>
                  <motion.div
                    className="w-8 h-4 rounded-full flex items-center transition-all duration-200"
                    style={{ 
                      background: isGroupVisible(group.id) ? group.color : 'var(--color-border-primary)',
                      border: `1px solid ${isGroupVisible(group.id) ? group.color : 'var(--color-border-primary)'}`
                    }}
                    animate={{ 
                      background: isGroupVisible(group.id) ? group.color : 'var(--color-border-primary)'
                    }}
                  >
                    <motion.div
                      className="w-3 h-3 rounded-full bg-[var(--color-bg-primary)] shadow-sm transition-transform duration-200"
                      animate={{ x: isGroupVisible(group.id) ? 20 : 2 }}
                    />
                  </motion.div>
                  <motion.span
                    animate={{ rotate: expandedGroups[group.id] ? 180 : 0 }}
                    className="text-[var(--color-text-muted)]"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </div>
              </button>

              <AnimatePresence mode="popLayout">
                {expandedGroups[group.id] && isGroupVisible(group.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 ml-8 space-y-1 border-l border-[var(--color-border-primary)] pl-3"
                  >
                    {group.layers.map(layer => (
                      <LayerItem
                        key={layer.id}
                        layer={layer}
                        groupColor={group.color}
                        isActive={isLayerActive(layer.id)}
                        onToggle={toggleLayer}
                        onOpacityChange={setOpacity}
                        opacity={layerOpacity[layer.id] ?? 1}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isCollapsed && (
          <motion.div
            className="pt-4 border-t border-[var(--color-border-primary)] space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              className="btn-tactical w-full justify-center py-2"
              onClick={enableAll}
            >
              <Eye className="w-4 h-4 mr-2" />
              ENABLE ALL LAYERS
            </button>
            <button
              className="btn-tactical w-full justify-center py-2 warning"
              onClick={disableAll}
            >
              <EyeOff className="w-4 h-4 mr-2" />
              DISABLE ALL LAYERS
            </button>
            <button
              className="btn-tactical w-full justify-center py-2"
              onClick={resetToDefaults}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              RESET TO DEFAULTS
            </button>
          </motion.div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--color-border-primary)]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-muted)]">QUICK ACTIONS</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-tactical py-2 justify-center text-xs"
            onClick={() => toggleSidebar('events', true)}
          >
            <Filter className="w-4 h-4 mr-1" />
            EVENT FEED
          </button>
          <button
            className="btn-tactical py-2 justify-center text-xs"
            onClick={() => toggleSidebar('dossier', true)}
          >
            <Globe className="w-4 h-4 mr-1" />
            DOSSIER
          </button>
        </div>
      </div>

      <div 
        className="w-1 cursor-col-resize absolute right-0 top-0 bottom-0"
        style={{ background: 'linear-gradient(180deg, transparent, var(--color-border-primary), transparent)' }}
        onMouseDown={handleResize}
        aria-label="Resize panel"
        role="slider"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPanelWidth('left', panelWidths.left - 20)
          if (e.key === 'ArrowRight') setPanelWidth('left', panelWidths.left + 20)
        }}
      />
    </motion.div>
  )
}

const LayerItem = ({ layer, groupColor, isActive, onToggle, onOpacityChange, opacity }) => {
  const [showOpacity, setShowOpacity] = useState(false)
  
  return (
    <div className="relative group">
      <button
        className="w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200"
        onClick={() => onToggle(layer.id)}
        onKeyDown={(e) => handleKeyDown(e, layer.id)}
        tabIndex={0}
        style={{ 
          background: isActive ? `${groupColor}15` : 'transparent',
          border: `1px solid ${isActive ? groupColor : 'transparent'}`,
          borderLeft: `3px solid ${isActive ? groupColor : 'transparent'}`
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <motion.div
            className="w-6 h-6 flex items-center justify-center rounded transition-all duration-200"
            style={{ 
              background: isActive ? groupColor : 'var(--color-bg-tertiary)',
              border: `1px solid ${isActive ? groupColor : 'var(--color-border-primary)'}`
            }}
            animate={{ 
              scale: isActive ? 1 : 0.9,
              background: isActive ? groupColor : 'var(--color-bg-tertiary)'
            }}
          >
            {isActive && (
              <motion.div 
                className="w-3 h-3" 
                style={{ background: 'var(--color-bg-primary)', borderRadius: 1 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs text-[var(--color-text-primary)] truncate">
              {layer.label}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)] truncate">
              {layer.default ? 'DEFAULT' : 'OPTIONAL'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showOpacity && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 80 }}
              exit={{ opacity: 0, width: 0 }}
              className="relative"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                className="w-full h-2 appearance-none bg-[var(--color-bg-tertiary)] rounded"
                style={{
                  accentColor: groupColor
                }}
              />
            </motion.div>
          )}
          <button
            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              setShowOpacity(!showOpacity)
            }}
            aria-label="Adjust opacity"
          >
            <Settings className="w-3 h-3 text-[var(--color-text-muted)]" />
          </button>
        </div>
      </button>
    </div>
  )
}

export default LayerControlPanel