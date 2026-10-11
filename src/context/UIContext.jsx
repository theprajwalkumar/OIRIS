import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const UIContext = createContext(null)

export const UIProvider = ({ children }) => {
  const mapRef = useRef(null)
  const globeRef = useRef(null)
  const [center, setCenter] = useState([20, 0])
  const [zoom, setZoom] = useState(2.5)
  const [mapMode, setMapMode] = useState('2D')
  const [sidebars, setSidebars] = useState({
    events: false,
    dossier: false,
    settings: false,
    help: false
  })
  const [modals, setModals] = useState({
    commandPalette: false,
    export: false,
    share: false,
    settings: false
  })
  const [toasts, setToasts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('en')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [panelWidths, setPanelWidths] = useState({
    left: 380,
    right: 420
  })
  const [cursorPosition, setCursorPosition] = useState(null)
  const [measureMode, setMeasureMode] = useState(false)
  const [measurePoints, setMeasurePoints] = useState([])

  const toggleSidebar = useCallback((key, force) => {
    setSidebars(prev => ({ ...prev, [key]: force !== undefined ? force : !prev[key] }))
  }, [])

  const closeAllSidebars = useCallback(() => {
    setSidebars({ events: false, dossier: false, settings: false, help: false })
  }, [])

  const openSidebar = useCallback((key) => {
    setSidebars(prev => ({ ...prev, [key]: true }))
  }, [])

  const closeSidebar = useCallback((key) => {
    setSidebars(prev => ({ ...prev, [key]: false }))
  }, [])

  const toggleModal = useCallback((key, force) => {
    setModals(prev => ({ ...prev, [key]: force !== undefined ? force : !prev[key] }))
  }, [])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const newToast = { id, ...toast, timestamp: Date.now() }
    setToasts(prev => [...prev.slice(-4), newToast])
    if (toast.duration !== 0) {
      setTimeout(() => removeToast(id), toast.duration || 5000)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random()
    const newNotif = { id, ...notification, timestamp: Date.now(), read: false }
    setNotifications(prev => [newNotif, ...prev.slice(0, 99)])
    return id
  }, [])

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const setMapCenter = useCallback((lat, lng) => {
    setCenter([lat, lng])
  }, [])

  const setMapZoom = useCallback((z) => {
    setZoom(Math.max(1, Math.min(19, z)))
  }, [])

  const toggleMapMode = useCallback(() => {
    setMapMode(prev => (prev === '2D' ? '3D' : '2D'))
  }, [])

  const fitBounds = useCallback((bounds, options) => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, options)
    }
  }, [mapRef])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const next = !prev
      if (next) {
        document.documentElement.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
      return next
    })
  }, [])

  const setPanelWidth = useCallback((side, width) => {
    setPanelWidths(prev => ({ ...prev, [side]: Math.max(280, Math.min(600, width)) }))
  }, [])

  const startMeasure = useCallback(() => {
    setMeasureMode(true)
    setMeasurePoints([])
  }, [])

  const addMeasurePoint = useCallback((latlng) => {
    setMeasurePoints(prev => [...prev, latlng])
  }, [])

  const clearMeasure = useCallback(() => {
    setMeasureMode(false)
    setMeasurePoints([])
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <UIContext.Provider value={{
      mapRef,
      globeRef,
      center,
      setCenter: setMapCenter,
      zoom,
      setZoom: setMapZoom,
      mapMode,
      setMapMode,
      toggleMapMode,
      fitBounds,
      sidebars,
      toggleSidebar,
      closeAllSidebars,
      openSidebar,
      closeSidebar,
      modals,
      toggleModal,
      toasts,
      addToast,
      removeToast,
      notifications,
      addNotification,
      markNotificationRead,
      clearNotifications,
      theme,
      setTheme,
      language,
      setLanguage,
      isFullscreen,
      toggleFullscreen,
      panelWidths,
      setPanelWidth,
      cursorPosition,
      setCursorPosition,
      measureMode,
      setMeasureMode,
      measurePoints,
      addMeasurePoint,
      clearMeasure,
      startMeasure
    }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}