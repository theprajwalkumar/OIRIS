import { useState, useCallback, useEffect, useRef } from 'react'
import { useEvents } from '../context/EventContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useMapLayers } from '../context/MapLayerContext.jsx'

export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState([])
  const { events, getFilteredEvents } = useEvents()
  const { toggleSidebar, sidebars } = useUI()
  const { layerGroups, toggleLayer, isLayerActive, enableAll, disableAll, resetToDefaults } = useMapLayers()
  const searchIndex = useRef(null)

  useEffect(() => {
    buildSearchIndex()
  }, [events])

  const buildSearchIndex = useCallback(() => {
    const index = []
    events.forEach((event, id) => {
      index.push({
        id,
        type: 'event',
        title: event.title,
        subtitle: `${event.category} · ${event.severity.toUpperCase()}`,
        keywords: [event.title, event.type, event.category, event.source, event.countryCode].filter(Boolean).join(' ').toLowerCase(),
        action: () => {
          setIsOpen(false)
          toggleSidebar('events', true)
        }
      })
    })

    Object.entries(layerGroups).forEach(([groupId, group]) => {
      group.layers.forEach(layer => {
        index.push({
          id: `layer-${layer.id}`,
          type: 'layer',
          title: layer.label,
          subtitle: `${group.label} Layer`,
          keywords: `${layer.label} ${group.label}`.toLowerCase(),
          action: () => {
            toggleLayer(layer.id)
            setIsOpen(false)
          }
        })
      })
    })

    const countries = new Set()
    events.forEach(event => {
      if (event.countryCode) countries.add(event.countryCode)
    })
    countries.forEach(code => {
      index.push({
        id: `country-${code}`,
        type: 'country',
        title: code,
        subtitle: 'Country Dossier',
        keywords: code.toLowerCase(),
        action: () => {
          setIsOpen(false)
          toggleSidebar('dossier', true)
        }
      })
    })

    searchIndex.current = index
  }, [events, layerGroups, toggleLayer, toggleSidebar])

  const search = useCallback((q) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const terms = q.toLowerCase().split(' ').filter(Boolean)
    const scored = searchIndex.current?.map(item => {
      let score = 0
      terms.forEach(term => {
        if (item.title.toLowerCase().includes(term)) score += 10
        if (item.keywords.includes(term)) score += 5
        if (item.subtitle.toLowerCase().includes(term)) score += 3
      })
      return { ...item, score }
    }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20) || []
    setResults(scored)
    setSelectedIndex(0)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    setResults([])
    setSelectedIndex(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const toggle = useCallback((force) => {
    if (force !== undefined) {
      force ? open() : close()
    } else {
      isOpen ? close() : open()
    }
  }, [isOpen, open, close])

  const selectResult = useCallback((index) => {
    if (results[index]) {
      results[index].action()
    }
  }, [results])

  const navigate = useCallback((direction) => {
    setSelectedIndex(prev => {
      const max = results.length - 1
      if (max < 0) return 0
      let next = prev + direction
      if (next < 0) next = max
      if (next > max) next = 0
      return next
    })
  }, [results.length])

  return {
    isOpen,
    query,
    setQuery,
    results,
    selectedIndex,
    open,
    close,
    toggle,
    search,
    selectResult,
    navigate
  }
}