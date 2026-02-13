import React, { createContext, useReducer, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import { dashboardReducer, initialState } from '../utils/dashboardReducer'
import API_CONFIG from '../config/api'

export const DashboardContext = createContext()

export function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  const socketRef = useRef(null)

  useEffect(() => {
    const fetchInitialDashboard = async () => {
      try {
        const response = await fetch(API_CONFIG.ENDPOINTS.DASHBOARD)
        if (!response.ok) {
          console.error('Dashboard fetch failed with status:', response.status)
          return
        }
        const data = await response.json()
        console.log('Dashboard data received:', data)
        dispatch({ type: 'UPDATE_ALL_DATA', payload: data })
      } catch (error) {
        console.error('Failed to fetch initial dashboard data:', error)
      }
    }

    // Fetch data immediately on mount
    fetchInitialDashboard()

    const connectSocket = () => {
      try {
        const socketUrl = API_CONFIG.BASE_URL
        socketRef.current = io(socketUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          autoConnect: true,
        })

        socketRef.current.on('connect', () => {
          console.log('Socket.IO connected')
          dispatch({ type: 'SET_CONNECTED', payload: true })
          fetchInitialDashboard()
        })

        socketRef.current.on('disconnect', () => {
          console.log('Socket.IO disconnected')
          dispatch({ type: 'SET_CONNECTED', payload: false })
        })

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket.IO error:', error)
          dispatch({ type: 'SET_CONNECTED', payload: false })
        })

        socketRef.current.on('telemetry_update', fetchInitialDashboard)
        socketRef.current.on('process_started', fetchInitialDashboard)
        socketRef.current.on('process_ended', fetchInitialDashboard)
        socketRef.current.on('defect_detected', fetchInitialDashboard)
      } catch (error) {
        console.error('Failed to connect Socket.IO:', error)
      }
    }

    connectSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.off('telemetry_update', fetchInitialDashboard)
        socketRef.current.off('process_started', fetchInitialDashboard)
        socketRef.current.off('process_ended', fetchInitialDashboard)
        socketRef.current.off('defect_detected', fetchInitialDashboard)
        socketRef.current.disconnect()
      }
    }
  }, [])

  const sendMessage = (message) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('client_message', message)
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
