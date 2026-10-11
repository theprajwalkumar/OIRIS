import { generateEventId } from './helpers.js'

let eventSubscribers = []

export function subscribeToEvents(callback) {
  eventSubscribers.push(callback)
  return () => {
    eventSubscribers = eventSubscribers.filter(cb => cb !== callback)
  }
}

function notifySubscribers(events) {
  eventSubscribers.forEach(cb => cb(events))
}

export function addEvents(eventArray) {
  if (!Array.isArray(eventArray) || eventArray.length === 0) return
  
  const events = eventArray.map(eventData => ({
    id: eventData.id || generateEventId(),
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
  }))
  
  notifySubscribers(events)
}

export function addEvent(eventData) {
  addEvents([eventData])
}

let globalEventMap = new Map()
let globalStats = {
  total: 0, critical: 0, high: 0, medium: 0, info: 0,
  byCategory: {}, byCountry: {}
}

function updateGlobalStats() {
  globalStats = {
    total: globalEventMap.size,
    critical: 0, high: 0, medium: 0, info: 0,
    byCategory: {}, byCountry: {}
  }
  
  globalEventMap.forEach(event => {
    globalStats[event.severity] = (globalStats[event.severity] || 0) + 1
    globalStats.byCategory[event.category] = (globalStats.byCategory[event.category] || 0) + 1
    if (event.countryCode) {
      globalStats.byCountry[event.countryCode] = (globalStats.byCountry[event.countryCode] || 0) + 1
    }
  })
}

export function getEventStore() {
  return {
    get events() { return globalEventMap },
    get stats() { return globalStats },
    addEvents,
    addEvent,
    clear: () => { globalEventMap.clear(); updateGlobalStats() }
  }
}

const eventStore = getEventStore()

export default eventStore