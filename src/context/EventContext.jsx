import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { subscribeToEvents } from '../utils/eventStore.js'

const EventContext = createContext(null)

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, info: 3 }

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState(new Map())
  const [activeEvent, setActiveEvent] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState(new Set())
  const [filters, setFilters] = useState({
    severity: [],
    categories: [],
    countries: [],
    dateRange: null,
    searchQuery: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    info: 0,
    byCategory: {},
    byCountry: {}
  })
  const [isLoading, setIsLoading] = useState(false)

  const updateStats = useCallback((eventMap) => {
    const newStats = {
      total: eventMap.size,
      critical: 0,
      high: 0,
      medium: 0,
      info: 0,
      byCategory: {},
      byCountry: {}
    }

    eventMap.forEach(event => {
      newStats[event.severity] = (newStats[event.severity] || 0) + 1
      newStats.byCategory[event.category] = (newStats.byCategory[event.category] || 0) + 1
      if (event.countryCode) {
        newStats.byCountry[event.countryCode] = (newStats.byCountry[event.countryCode] || 0) + 1
      }
    })

    setStats(newStats)
  }, [])

  const handleNewEvents = useCallback((newEvents) => {
    setEvents(prev => {
      const newMap = new Map(prev)
      newEvents.forEach(e => {
        if (!newMap.has(e.id)) {
          newMap.set(e.id, e)
        }
      })
      if (newMap.size > 10000) {
        const sorted = Array.from(newMap.entries())
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, 8000)
        return new Map(sorted)
      }
      updateStats(newMap)
      return newMap
    })
  }, [updateStats])

  useEffect(() => {
    const unsubscribe = subscribeToEvents(handleNewEvents)
    return unsubscribe
  }, [handleNewEvents])

  const addEvent = useCallback((eventData) => {
    const event = {
      id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lat: eventData.lat,
      lng: eventData.lng,
      geo: eventData.geo,
      severity: eventData.severity || 'info',
      type: eventData.type || 'unknown',
      category: eventData.category || 'other',
      title: eventData.title || 'Untitled Event',
      details: eventData.details || {},
      source: eventData.source || 'unknown',
      timestamp: eventData.timestamp || Date.now(),
      countryCode: eventData.countryCode || null,
      metadata: eventData.metadata || {}
    }

    setEvents(prev => {
      const newMap = new Map(prev)
      if (!newMap.has(event.id)) {
        newMap.set(event.id, event)
      }
      if (newMap.size > 10000) {
        const sorted = Array.from(newMap.entries())
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, 8000)
        return new Map(sorted)
      }
      updateStats(newMap)
      return newMap
    })
  }, [updateStats])

  const addEvents = useCallback((eventArray) => {
    eventArray.forEach(addEvent)
  }, [addEvent])

  const removeEvent = useCallback((id) => {
    setEvents(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      updateStats(newMap)
      return newMap
    })
    setSelectedEvents(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    if (activeEvent?.id === id) {
      setActiveEvent(null)
    }
  }, [activeEvent, updateStats])

  const clearEvents = useCallback((category) => {
    setEvents(prev => {
      if (!category) {
        updateStats(new Map())
        return new Map()
      }
      const newMap = new Map(prev)
      for (const [id, event] of newMap) {
        if (event.category === category) {
          newMap.delete(id)
        }
      }
      updateStats(newMap)
      return newMap
    })
  }, [updateStats])

  const selectEvent = useCallback((id) => {
    setEvents(prev => {
      const event = prev.get(id)
      if (event) {
        setActiveEvent(event)
      }
      return prev
    })
  }, [])

  const toggleEventSelection = useCallback((id) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    setEvents(prev => {
      const visible = Array.from(prev.values()).filter(event => matchesFilters(event, filters))
      setSelectedEvents(new Set(visible.map(e => e.id)))
      return prev
    })
  }, [filters])

  const clearSelection = useCallback(() => {
    setSelectedEvents(new Set())
  }, [])

  const exportEvents = useCallback(async (format = 'json') => {
    const visibleEvents = Array.from(events.values()).filter(event => matchesFilters(event, filters))
    const data = visibleEvents.map(event => ({
      id: event.id,
      timestamp: new Date(event.timestamp).toISOString(),
      latitude: event.lat,
      longitude: event.lng,
      severity: event.severity,
      type: event.type,
      category: event.category,
      title: event.title,
      countryCode: event.countryCode,
      source: event.source,
      details: event.details
    }))

    let content, mimeType, extension
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'latitude', 'longitude', 'severity', 'type', 'category', 'title', 'countryCode', 'source']
      const rows = data.map(d => headers.map(h => `"${String(d[h] || '').replace(/"/g, '""')}"`).join(','))
      content = [headers.join(','), ...rows].join('\n')
      mimeType = 'text/csv'
      extension = 'csv'
    } else {
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
      extension = 'json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `osiris-export-${Date.now()}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [events, filters])

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      severity: [],
      categories: [],
      countries: [],
      dateRange: null,
      searchQuery: ''
    })
  }, [])

  const getFilteredEvents = useCallback(() => {
    return Array.from(events.values()).filter(event => matchesFilters(event, filters))
  }, [events, filters])

  const getEventById = useCallback((id) => {
    return events.get(id)
  }, [events])

  const getEventsByCountry = useCallback((countryCode) => {
    return Array.from(events.values()).filter(e => e.countryCode === countryCode)
  }, [events])

  const getEventsByCategory = useCallback((category) => {
    return Array.from(events.values()).filter(e => e.category === category)
  }, [events])

  return (
    <EventContext.Provider value={{
      events,
      activeEvent,
      setActiveEvent,
      selectedEvents,
      filters,
      stats,
      isLoading,
      addEvent,
      addEvents,
      removeEvent,
      clearEvents,
      selectEvent,
      toggleEventSelection,
      selectAllVisible,
      clearSelection,
      exportEvents,
      setFilter,
      clearFilters,
      getFilteredEvents,
      getEventById,
      getEventsByCountry,
      getEventsByCategory
    }}>
      {children}
    </EventContext.Provider>
  )
}

export const useEvents = () => {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider')
  }
  return context
}

function matchesFilters(event, filters) {
  if (filters.severity.length > 0 && !filters.severity.includes(event.severity)) {
    return false
  }
  if (filters.categories.length > 0 && !filters.categories.includes(event.category)) {
    return false
  }
  if (filters.countries.length > 0 && event.countryCode && !filters.countries.includes(event.countryCode)) {
    return false
  }
  if (filters.dateRange) {
    const [start, end] = filters.dateRange
    if (event.timestamp < start || event.timestamp > end) {
      return false
    }
  }
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    const searchable = [
      event.title,
      event.type,
      event.category,
      event.source,
      event.countryCode,
      JSON.stringify(event.details)
    ].join(' ').toLowerCase()
    if (!searchable.includes(query)) {
      return false
    }
  }
  return true
}