import { useState, useEffect, useCallback } from 'react'
import { useUI } from '../context/UIContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'
import { useEvents } from '../context/EventContext.jsx'

export const useURLState = () => {
  const { center, zoom, setCenter, setZoom } = useUI()
  const { activeLayers, setActiveLayers } = useMapLayers()
  const { activeEvent } = useEvents()

  const [isRestoring, setIsRestoring] = useState(false)

  const encodeState = useCallback(() => {
    const state = {
      c: center.map(c => Math.round(c * 1e6) / 1e6),
      z: Math.round(zoom * 10) / 10,
      l: Object.entries(activeLayers).filter(([, v]) => v).map(([k]) => k),
      e: activeEvent?.id || null
    }
    return btoa(JSON.stringify(state)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }, [center, zoom, activeLayers, activeEvent])

  const decodeState = useCallback((hash) => {
    try {
      const cleaned = hash.replace(/-/g, '+').replace(/_/g, '/')
      const padded = cleaned + '='.repeat((4 - cleaned.length % 4) % 4)
      const decoded = atob(padded)
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }, [])

  const applyState = useCallback((state) => {
    if (!state) return false
    setIsRestoring(true)
    try {
      if (state.c && Array.isArray(state.c) && state.c.length === 2) {
        setCenter(state.c)
      }
      if (typeof state.z === 'number') {
        setZoom(state.z)
      }
      if (Array.isArray(state.l)) {
        const newLayers = {}
        state.l.forEach(id => { newLayers[id] = true })
        setActiveLayers(newLayers)
      }
      return true
    } finally {
      setTimeout(() => setIsRestoring(false), 100)
    }
  }, [setCenter, setZoom, setActiveLayers])

  const updateURL = useCallback(() => {
    const encoded = encodeState()
    const newHash = `#${encoded}`
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash)
    }
  }, [encodeState])

  const shareURL = useCallback(() => {
    const encoded = encodeState()
    return `${window.location.origin}${window.location.pathname}#${encoded}`
  }, [encodeState])

  useEffect(() => {
    if (isRestoring) return
    const debounced = setTimeout(updateURL, 500)
    return () => clearTimeout(debounced)
  }, [center, zoom, activeLayers, activeEvent, updateURL, isRestoring])

  useEffect(() => {
    if (window.location.hash) {
      const state = decodeState(window.location.hash.slice(1))
      if (state) {
        applyState(state)
      }
    }
  }, [])

  return {
    encodeState,
    decodeState,
    applyState,
    updateURL,
    shareURL,
    isRestoring
  }
}