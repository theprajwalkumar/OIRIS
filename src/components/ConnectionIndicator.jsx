import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, WifiOff, Server, Database, 
  AlertTriangle, CheckCircle, XCircle,
  RotateCcw, Download, ExternalLink
} from 'lucide-react'
import { useWS } from '../context/WSContext.jsx'

const ConnectionIndicator = () => {
  const { status, messageCount, errors, lastMessage, reconnect } = useWS()
  const [showDetails, setShowDetails] = useState(false)

  const statusConfig = {
    connected: { 
      icon: Wifi, 
      color: '#00ff88', 
      label: 'LIVE', 
      desc: 'Receiving real-time data streams',
      pulse: true
    },
    reconnecting: { 
      icon: RotateCcw, 
      color: '#ffb800', 
      label: 'RECONNECTING', 
      desc: 'Attempting to restore connection...',
      pulse: false
    },
    disconnected: { 
      icon: WifiOff, 
      color: '#64748b', 
      label: 'OFFLINE', 
      desc: 'No active data connection',
      pulse: false
    },
    failed: { 
      icon: XCircle, 
      color: '#ff3355', 
      label: 'FAILED', 
      desc: 'Connection failed - manual intervention required',
      pulse: false
    }
  }

  const config = statusConfig[status] || statusConfig.disconnected
  const Icon = config.icon

  return (
    <motion.div
      className="fixed right-20 bottom-14 z-30 panel-glass border border-[var(--color-border-primary)] rounded-lg pointer-events-auto"
      style={{ 
        width: 280,
        boxShadow: '4px 4px 24px rgba(0,0,0,0.4)'
      }}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      <div className="p-3 border-b border-[var(--color-border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-7 h-7 flex items-center justify-center rounded"
            style={{ background: `${config.color}22` }}
            animate={{ 
              scale: config.pulse ? [1, 1.05, 1] : 1,
              boxShadow: config.pulse ? [
                `0 0 0 0 ${config.color}44`,
                `0 0 0 8px ${config.color}00`,
                `0 0 0 0 ${config.color}44`
              ] : 'none'
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </motion.div>
          <div>
            <div className="font-mono text-xs uppercase tracking-wider" style={{ color: config.color }}>
              {config.label}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
              {config.desc}
            </div>
          </div>
        </div>
        <button
          className="btn-tactical p-1"
          onClick={() => setShowDetails(!showDetails)}
          aria-label={showDetails ? 'Hide details' : 'Show details'}
        >
          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
            {showDetails ? 'HIDE' : 'DETAILS'}
          </span>
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {showDetails && (
          <motion.div
            className="p-3 space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-2 gap-2">
              <ConnectionMetric 
                label="MESSAGES" 
                value={messageCount} 
                icon={Database} 
                color="#00d4ff" 
              />
              <ConnectionMetric 
                label="ERRORS" 
                value={errors.length} 
                icon={AlertTriangle} 
                color={errors.length > 0 ? '#ff3355' : '#00ff88'} 
              />
            </div>

            {lastMessage && (
              <div className="panel-glass p-2 rounded">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">LAST MESSAGE</div>
                <div className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                  Type: {lastMessage.type}
                </div>
                <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                  {new Date(lastMessage.timestamp || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="panel-glass p-2 rounded">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">RECENT ERRORS</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {errors.slice(-5).map((error, i) => (
                    <div key={i} className="font-mono text-[10px] text-[var(--color-accent-crimson)] flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                className="btn-tactical flex-1 justify-center"
                onClick={reconnect}
                disabled={status === 'connected'}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                RECONNECT
              </button>
              <button className="btn-tactical p-2" title="Copy connection info">
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const ConnectionMetric = ({ label, value, icon: Icon, color }) => (
  <div className="panel-glass p-3 rounded text-center">
    <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
    <div className="font-mono text-2xl" style={{ color }}>{value}</div>
    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
  </div>
)

export default ConnectionIndicator