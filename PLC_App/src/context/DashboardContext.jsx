import React, { createContext, useReducer, useRef, useEffect } from 'react'
import { dashboardReducer, initialState } from '../utils/dashboardReducer'
import API_CONFIG from '../config/api'

export const DashboardContext = createContext()

export function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  useEffect(() => {
    const fetchInitialDashboard = async () => {
      try {
        const response = await fetch(API_CONFIG.ENDPOINTS.DASHBOARD)
        if (!response.ok) return
        const data = await response.json()
        dispatch({ type: 'UPDATE_ALL_DATA', payload: data })
      } catch (error) {
        console.error('Failed to fetch initial dashboard data:', error)
      }
    }

    const connectWebSocket = () => {
      try {
        // Connect to WebSocket server
        const wsUrl = API_CONFIG.WS_URL || 'ws://localhost:8080/dashboard'
        socketRef.current = new WebSocket(wsUrl)

        socketRef.current.onopen = () => {
          console.log('WebSocket connected')
          dispatch({ type: 'SET_CONNECTED', payload: true })
          fetchInitialDashboard()
        }

        socketRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        socketRef.current.onerror = (error) => {
          console.error('WebSocket error:', error)
          dispatch({ type: 'SET_CONNECTED', payload: false })
        }

        socketRef.current.onclose = () => {
          console.log('WebSocket disconnected')
          dispatch({ type: 'SET_CONNECTED', payload: false })
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
      }
    }

    const handleMessage = (message) => {
      const { type, payload } = message

      switch (type) {
        case 'UPDATE_STATS':
          dispatch({ type: 'UPDATE_STATS', payload: payload.stats })
          break

        case 'UPDATE_RUNTIME':
          dispatch({ type: 'UPDATE_RUNTIME_POINTS', payload: payload.points })
          break

        case 'UPDATE_PRODUCTION':
          dispatch({ type: 'UPDATE_PRODUCTION_BARS', payload: payload.bars })
          break

        case 'UPDATE_LOG':
          dispatch({ type: 'UPDATE_LOG_ROWS', payload: payload.rows })
          break

        case 'UPDATE_SINGLE_STAT':
          dispatch({ type: 'UPDATE_SINGLE_STAT', payload: payload })
          break

        case 'UPDATE_ALL':
          dispatch({ type: 'UPDATE_ALL_DATA', payload: payload })
          break

        default:
          console.warn('Unknown message type:', type)
      }
    }

    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  const sendMessage = (message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  const value = {
    state,
    dispatch,
    sendMessage,
    isConnected: state.isConnected,
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}
