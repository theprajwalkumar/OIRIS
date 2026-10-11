import { useEffect, useCallback } from 'react'
import { useCommandPalette } from './useCommandPalette.js'
import { useUI } from '../context/UIContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useEvents } from '../context/EventContext.jsx'

export const useHotkeys = () => {
  const { toggle: togglePalette } = useCommandPalette()
  const { toggleSidebar, sidebars, toggleFullscreen, startMeasure, clearMeasure } = useUI()
  const { toggleLayer, enableAll, disableAll, resetToDefaults, layerGroups } = useMapLayers()
  const { clearFilters, clearSelection } = useEvents()

  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      if (!(e.metaKey || e.ctrlKey) && e.key !== 'Escape') return
    }

    const isMac = navigator.platform.includes('Mac')
    const mod = isMac ? e.metaKey : e.ctrlKey
    const shift = e.shiftKey
    const alt = e.altKey

    if (mod && e.key === 'k') {
      e.preventDefault()
      togglePalette()
      return
    }

    if (e.key === 'Escape') {
      if (sidebars.events) toggleSidebar('events', false)
      if (sidebars.dossier) toggleSidebar('dossier', false)
      if (sidebars.settings) toggleSidebar('settings', false)
      clearMeasure()
      return
    }

    if (mod && e.key === 'e') {
      e.preventDefault()
      return
    }

    if (mod && shift && e.key === 'f') {
      e.preventDefault()
      toggleFullscreen()
      return
    }

    if (mod && e.key === 'm') {
      e.preventDefault()
      startMeasure()
      return
    }

    if (e.key >= '1' && e.key <= '6' && !mod && !alt) {
      const groups = Object.values(layerGroups)
      const index = parseInt(e.key) - 1
      if (groups[index]) {
        const groupId = groups[index].id
        const isVisible = Object.values(groups[index].layers).some(l => l.default)
        // Toggle group would need group visibility state
      }
      return
    }

    if (alt && e.key === 'ArrowUp') {
      e.preventDefault()
      return
    }

    if (alt && e.key === 'ArrowDown') {
      e.preventDefault()
      return
    }

    if (e.key === 'r' && !mod && !shift && !alt) {
      resetToDefaults()
      return
    }

    if (e.key === 'a' && mod && shift) {
      e.preventDefault()
      enableAll()
      return
    }

    if (e.key === 'd' && mod && shift) {
      e.preventDefault()
      disableAll()
      return
    }

    if (e.key === 'f' && !mod && !shift && !alt) {
      clearFilters()
      return
    }

    if (e.key === 'x' && !mod && !shift && !alt) {
      clearSelection()
      return
    }

    if (e.key === '?' && shift) {
      e.preventDefault()
      toggleSidebar('help', true)
      return
    }
  }, [
    togglePalette, 
    sidebars, 
    toggleSidebar, 
    toggleFullscreen, 
    startMeasure, 
    clearMeasure,
    layerGroups,
    toggleLayer,
    enableAll,
    disableAll,
    resetToDefaults,
    clearFilters,
    clearSelection
  ])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}