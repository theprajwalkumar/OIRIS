import React, { useState, useEffect, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { EventProvider, useEvents } from './context/EventContext.jsx'
import { WSProvider } from './context/WSContext.jsx'
import { MapLayerProvider } from './context/MapLayerContext.jsx'
import { UIProvider } from './context/UIContext.jsx'
import { FlightProvider } from './context/FlightContext.jsx'
import { useCommandPalette } from './hooks/useCommandPalette.js'
import { useURLState } from './hooks/useURLState.js'
import { useHotkeys } from './hooks/useHotkeys.js'
import Dashboard from './components/dashboard/Dashboard.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import ExportModal from './components/ExportModal.jsx'

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const INIT_LINES = [
  'BOOT SEQ · WORLD MONITOR CORE',
  'LINKING GEOSPATIAL TILE MESH ......... OK',
  'MOUNTING EVENT BUS / WEBSOCKET ....... OK',
  'AUTH FEEDS · USGS · EONET · GDACS .... OK',
  'AUTH FEEDS · IODA · NOAA · ISS ....... OK',
  'CALIBRATING SENSOR FUSION ............ OK',
  'TACTICAL OVERLAY ONLINE'
]

const InitScreen = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-primary)]">
    <div className="absolute inset-0 grid-overlay opacity-40 pointer-events-none" aria-hidden="true" />
    <div className="absolute inset-0 vignette pointer-events-none" aria-hidden="true" />
    <div className="relative text-center px-6">
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-lg border border-[var(--color-accent-emerald)] flex items-center justify-center animate-pulse"
          style={{ boxShadow: '0 0 24px rgba(0,255,136,0.25), inset 0 0 18px rgba(0,255,136,0.12)' }}>
          <Zap className="w-7 h-7 text-[var(--color-accent-emerald)]" />
        </div>
      </div>
      <p className="font-mono text-lg text-[var(--color-text-primary)] tracking-[0.3em] glow-emerald">WORLD&nbsp;MONITOR</p>
      <p className="font-mono text-[10px] text-[var(--color-text-muted)] mt-1 tracking-[0.4em]">GLOBAL SITUATIONAL AWARENESS</p>

      <div className="mt-7 w-72 mx-auto text-left space-y-1">
        {INIT_LINES.map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 * i, duration: 0.25 }}
            className="font-mono text-[10px] tracking-wider"
            style={{ color: i === INIT_LINES.length - 1 ? 'var(--color-accent-emerald)' : 'var(--color-text-muted)' }}
          >
            <span className="text-[var(--color-accent-cyan)]">{'>'}</span> {line}
          </motion.div>
        ))}
      </div>

      <div className="mt-7 w-72 h-1 mx-auto bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[var(--color-accent-emerald)] to-[var(--color-accent-cyan)]"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
        />
      </div>
    </div>
  </div>
)

const AppContent = () => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const { toggleCommandPalette, isCommandPaletteOpen } = useCommandPalette()
  const { exportEvents } = useEvents()

  useHotkeys()
  useURLState()

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialized(true), 1300)
    return () => clearTimeout(timer)
  }, [])

  const handleExport = useCallback(async (format) => {
    await exportEvents(format)
    setShowExportModal(false)
  }, [exportEvents])

  if (!isInitialized) {
    return <InitScreen />
  }

  return (
    <>
      <Dashboard onOpenSearch={() => toggleCommandPalette(true)} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={toggleCommandPalette}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </>
  )
}

const App = () => {
  return (
    <EventProvider>
      <WSProvider>
        <MapLayerProvider>
          <UIProvider>
            <FlightProvider>
            <AppContent />
            </FlightProvider>
          </UIProvider>
        </MapLayerProvider>
      </WSProvider>
    </EventProvider>
  )
}

export default App