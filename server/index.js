import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { startIngestionScheduler, getEventSnapshot } from './workers/ingestion.js'
import flightsRouter from './routes/flights.js'
import { listSeedMeta } from './cache.js'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(cors())
app.use(express.json())
app.use('/api', flightsRouter)

global.clients = new Set()
const clients = global.clients
const subscriptions = new Map()

const CHANNELS = [
  'events',
  'conflicts',
  'cisa-kev',
  'maritime',
  'aviation',
  'infrastructure',
  'physical',
  'cyber',
  'stats'
]

function broadcast(channel, data) {
  const message = JSON.stringify({ type: channel, payload: data, timestamp: Date.now() })
  clients.forEach(client => {
    if (client.readyState === 1 && (!client.subscriptions || client.subscriptions.has(channel) || client.subscriptions.has('all'))) {
      client.send(message)
    }
  })
}

function broadcastToAll(data) {
  const message = JSON.stringify({ type: 'events', payload: data, timestamp: Date.now() })
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message)
    }
  })
}

wss.on('connection', (ws, req) => {
  const clientId = uuidv4()
  ws.clientId = clientId
  ws.subscriptions = new Set(['all'])
  ws.isAlive = true
  
  clients.add(ws)
  console.log(`Client connected: ${clientId} (${clients.size} total)`)
  
  ws.send(JSON.stringify({ 
    type: 'welcome', 
    payload: { clientId, channels: CHANNELS },
    timestamp: Date.now()
  }))

  const snapshot = getEventSnapshot()
  if (snapshot.length > 0) {
    ws.send(JSON.stringify({ type: 'events', payload: snapshot, timestamp: Date.now() }))
  }

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (err) {
      console.error('Invalid message:', err)
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid JSON' }, timestamp: Date.now() }))
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`Client disconnected: ${clientId} (${clients.size} remaining)`)
  })

  ws.on('error', (err) => {
    console.error(`Client error ${clientId}:`, err)
  })
})

function handleMessage(ws, message) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      break
    case 'subscribe':
      const channels = Array.isArray(message.channels) ? message.channels : [message.channels]
      channels.forEach(ch => {
        if (CHANNELS.includes(ch) || ch === 'all') {
          ws.subscriptions.add(ch)
        }
      })
      ws.send(JSON.stringify({ 
        type: 'subscribed', 
        payload: { channels: Array.from(ws.subscriptions) },
        timestamp: Date.now()
      }))
      break
    case 'unsubscribe':
      const unsubChannels = Array.isArray(message.channels) ? message.channels : [message.channels]
      unsubChannels.forEach(ch => ws.subscriptions.delete(ch))
      ws.send(JSON.stringify({ 
        type: 'unsubscribed', 
        payload: { channels: Array.from(ws.subscriptions) },
        timestamp: Date.now()
      }))
      break
    case 'sync':
      ws.send(JSON.stringify({ 
        type: 'sync', 
        payload: { 
          connectedClients: clients.size,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        timestamp: Date.now()
      }))
      break
    default:
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unknown message type' }, timestamp: Date.now() }))
  }
}

const heartbeatInterval = setInterval(() => {
  clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => {
  clearInterval(heartbeatInterval)
})

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    clients: clients.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    freshness: listSeedMeta(),
    timestamp: Date.now()
  })
})

app.get('/api/stats', (req, res) => {
  res.json({
    connectedClients: clients.size,
    channels: CHANNELS,
    uptime: process.uptime(),
    timestamp: Date.now()
  })
})

app.post('/api/broadcast', (req, res) => {
  const { channel, data } = req.body
  if (channel && data) {
    broadcast(channel, data)
    res.json({ success: true })
  } else {
    res.status(400).json({ error: 'Channel and data required' })
  }
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`)
  
  startIngestionScheduler()
})

export { app, server, wss, broadcast, broadcastToAll, clients }