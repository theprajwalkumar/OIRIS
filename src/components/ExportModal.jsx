import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileJson, FileText, Download, X, Check, 
  Copy, AlertTriangle, Info, Database
} from 'lucide-react'
import { useEvents } from '../context/EventContext.jsx'
import { EXPORT_FORMATS } from '../utils/constants.js'
import { formatTimestamp } from '../utils/helpers.js'

const ExportModal = ({ isOpen, onClose, onExport }) => {
  const { getFilteredEvents } = useEvents()
  const [selectedFormat, setSelectedFormat] = useState('json')
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  const filteredEvents = getFilteredEvents()
  const eventCount = filteredEvents.length

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)
    try {
      await onExport(selectedFormat)
      setExportResult({ success: true, format: selectedFormat, count: eventCount })
    } catch (error) {
      setExportResult({ success: false, error: error.message })
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <motion.div
        className="relative w-full max-w-md panel-glass border border-[var(--color-border-glow)] rounded-lg overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.2)' }}
        initial={{ y: -20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -20, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00d4ff22, #b84dff22)' }}>
              <Download className="w-5 h-5 text-[var(--color-accent-cyan)]" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-text-primary)]">EXPORT DATA</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{eventCount} EVENTS SELECTED</div>
            </div>
          </div>
          <button className="btn-tactical p-1.5" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">FORMAT</label>
            <div className="flex gap-2">
              {EXPORT_FORMATS.map(format => (
                <button
                  key={format.id}
                  className="flex-1 btn-tactical p-3 flex flex-col items-center gap-2"
                  onClick={() => setSelectedFormat(format.id)}
                  style={{ 
                    borderColor: selectedFormat === format.id ? 'var(--color-accent-cyan)' : 'var(--color-border-primary)',
                    background: selectedFormat === format.id ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(184,77,255,0.1))' : 'transparent'
                  }}
                >
                  {format.icon === 'FileJson' ? <FileJson className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  <div className="text-center">
                    <div className="font-mono text-sm" style={{ color: selectedFormat === format.id ? 'var(--color-accent-cyan)' : 'var(--color-text-primary)' }}>
                      {format.label}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{format.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-glass p-3 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">EXPORT PREVIEW</span>
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)] space-y-1">
              <div>Events to export: <span className="text-[var(--color-accent-emerald)]">{eventCount}</span></div>
              <div>Format: <span className="text-[var(--color-accent-cyan)]">{selectedFormat.toUpperCase()}</span></div>
              <div>Size estimate: <span className="text-[var(--color-accent-amber)]">{Math.round(eventCount * (selectedFormat === 'json' ? 300 : 150) / 1024)} KB</span></div>
              <div>Timestamp: <span className="text-[var(--color-text-secondary)]">{formatTimestamp(Date.now())}</span></div>
            </div>
          </div>

          {exportResult && (
            <motion.div
              className="p-3 rounded flex items-center gap-2"
              style={{ 
                background: exportResult.success ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,85,0.15)',
                border: `1px solid ${exportResult.success ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,85,0.3)'}`
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {exportResult.success ? (
                <>
                  <Check className="w-5 h-5 text-[var(--color-accent-emerald)]" />
                  <div className="flex-1">
                    <div className="font-mono text-xs text-[var(--color-accent-emerald)]">EXPORT COMPLETE</div>
                    <div className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {exportResult.count} events saved as {exportResult.format.toUpperCase()}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-[var(--color-accent-crimson)]" />
                  <div className="font-mono text-xs text-[var(--color-accent-crimson)]">EXPORT FAILED</div>
                </>
              )}
            </motion.div>
          )}

          <div className="pt-2">
            <button
              className="btn-tactical w-full justify-center py-3 gap-2"
              onClick={handleExport}
              disabled={isExporting || eventCount === 0}
            >
              {isExporting ? (
                <>
                  <Database className="w-4 h-4 animate-spin" />
                  EXPORTING...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  EXPORT {selectedFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <div className="font-mono text-[10px] text-[var(--color-text-muted)] text-center">
            Data includes: coordinates, severity, category, timestamp, source, and full details metadata
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ExportModal