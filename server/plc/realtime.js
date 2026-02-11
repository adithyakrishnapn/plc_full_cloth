import WebSocket from 'ws'
import mongoose from 'mongoose'
import { PLCData, ProductionLog, Alert } from './models.js'
import { transformPlcDataToDashboard } from '../helpers/plcDashboard.js'

const DASHBOARD_POLL_INTERVAL = Number(process.env.DASHBOARD_POLL_INTERVAL || 10000)

export function initRealtime(wss) {
  const connectedClients = new Set()
  let pollIntervalId = null

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected')
    connectedClients.add(ws)

    ws.on('close', () => {
      console.log('WebSocket client disconnected')
      connectedClients.delete(ws)
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  })

  function broadcastToClients(message) {
    const data = JSON.stringify(message)
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  async function handleDashboardBroadcast() {
    try {
      const dashboardData = await transformPlcDataToDashboard()
      broadcastToClients({
        type: 'UPDATE_ALL',
        payload: dashboardData,
      })
    } catch (err) {
      console.error('Dashboard broadcast error:', err.message)
    }
  }

  function startPollingFallback() {
    if (pollIntervalId) return
    pollIntervalId = setInterval(handleDashboardBroadcast, DASHBOARD_POLL_INTERVAL)
    console.log(`Polling fallback enabled (${DASHBOARD_POLL_INTERVAL}ms)`)
  }

  function setupChangeStreams() {
    try {
      const plcStream = PLCData.watch()
      const logStream = ProductionLog.watch()
      const alertStream = Alert.watch()

      const onStreamError = (err) => {
        console.error('Change stream error:', err.message)
        startPollingFallback()
      }

      plcStream.on('change', async () => {
        await handleDashboardBroadcast()
      })

      logStream.on('change', async () => {
        await handleDashboardBroadcast()
      })

      alertStream.on('change', async (change) => {
        await handleDashboardBroadcast()

        if (change.operationType === 'insert') {
          const alert = change.fullDocument
          broadcastToClients({
            type: 'NEW_ALERT',
            payload: alert,
          })
        }
      })

      plcStream.on('error', onStreamError)
      logStream.on('error', onStreamError)
      alertStream.on('error', onStreamError)

      console.log('MongoDB change streams started')
    } catch (err) {
      console.error('Failed to start change streams:', err.message)
      startPollingFallback()
    }
  }

  mongoose.connection.once('open', () => {
    setupChangeStreams()
  })
}
