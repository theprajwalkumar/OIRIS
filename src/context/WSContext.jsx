import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { addEvents } from '../utils/eventStore.js'

const WSContext = createContext(null)

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length

export const WSProvider = ({ children }) => {
  const [ws, setWs] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [lastMessage, setLastMessage] = useState(null)
  const [messageCount, setMessageCount] = useState(0)
  const [errors, setErrors] = useState([])
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef(null)
  const heartbeatTimer = useRef(null)
  const messageQueue = useRef([])
  const isMounted = useRef(true)

  const connect = useCallback(() => {
    if (!isMounted.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // In development, connect directly to the WebSocket server on port 3001
    // In production, use the same host
    const wsUrl = import.meta.env.DEV 
      ? `${protocol}//localhost:3001/ws`
      : `${protocol}//${window.location.host}/ws`
    
    try {
      const socket = new WebSocket(wsUrl)
      
      socket.onopen = () => {
        setStatus('connected')
        reconnectAttempt.current = 0
        setErrors(prev => [...prev.slice(-9), { type: 'info', message: 'WebSocket connected', timestamp: Date.now() }])
        
        heartbeatTimer.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          setMessageCount(prev => prev + 1)
          
          switch (data.type) {
            case 'events':
              if (Array.isArray(data.payload)) {
                addEvents(data.payload)
              }
              break
            case 'event':
              addEvents([data.payload])
              break
            case 'welcome':
              // Server sent welcome message with clientId and channels
              console.log('[WS] Welcome:', data.payload)
              break
            case 'stats':
              break
            case 'pong':
              break
            case 'error':
              setErrors(prev => [...prev.slice(-9), { 
                type: 'error', 
                message: data.payload?.message || 'Server error', 
                timestamp: Date.now() 
              }])
              break
            default:
              break
          }
        } catch (err) {
          console.error('WS message parse error:', err)
        }
      }

      socket.onclose = (event) => {
        console.log('[WS] Connection closed:', event.code, event.reason)
        setStatus('disconnected')
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current)
        }
        
        if (isMounted.current && reconnectAttempt.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[reconnectAttempt.current] || 30000
          setStatus('reconnecting')
          setErrors(prev => [...prev.slice(-9), { 
            type: 'warning', 
            message: `Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempt.current + 1})`, 
            timestamp: Date.now() 
          }])
          
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempt.current++
            connect()
          }, delay)
        } else if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus('failed')
          setErrors(prev => [...prev.slice(-9), { 
            type: 'error', 
            message: 'Max reconnection attempts reached. Please refresh.', 
            timestamp: Date.now() 
          }])
        }
      }

      socket.onerror = (error) => {
        console.error('[WS] WebSocket error:', error)
        setErrors(prev => [...prev.slice(-9), { 
          type: 'error', 
          message: 'Connection error', 
          timestamp: Date.now() 
        }])
      }

      setWs(socket)
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setStatus('failed')
    }
  }, [])

  const send = useCallback((message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      return true
    } else {
      messageQueue.current.push(message)
      return false
    }
  }, [ws])

  const subscribe = useCallback((channels) => {
    send({ type: 'subscribe', channels: Array.isArray(channels) ? channels : [channels] })
  }, [send])

  const unsubscribe = useCallback((channels) => {
    send({ type: 'unsubscribe', channels: Array.isArray(channels) ? channels : [channels] })
  }, [send])

  const requestSync = useCallback(() => {
    send({ type: 'sync' })
  }, [send])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
    }
    if (ws) {
      ws.close(1000, 'Client disconnect')
    }
    setStatus('disconnected')
  }, [ws])

  const reconnect = useCallback(() => {
    reconnectAttempt.current = 0
    disconnect()
    setTimeout(connect, 100)
  }, [connect, disconnect])

  useEffect(() => {
    isMounted.current = true
    connect()
    
    return () => {
      isMounted.current = false
      disconnect()
    }
  }, [])

  const flushQueue = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      messageQueue.current.forEach(msg => ws.send(JSON.stringify(msg)))
      messageQueue.current = []
    }
  }, [ws])

  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      flushQueue()
    }
  }, [ws, flushQueue])

  return (
    <WSContext.Provider value={{
      status,
      lastMessage,
      messageCount,
      errors,
      send,
      subscribe,
      unsubscribe,
      requestSync,
      disconnect,
      reconnect,
      ws
    }}>
      {children}
    </WSContext.Provider>
  )
}

export const useWS = () => {
  const context = useContext(WSContext)
  if (!context) {
    throw new Error('useWS must be used within a WSProvider')
  }
  return context
}