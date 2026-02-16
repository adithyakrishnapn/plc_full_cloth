import React, { createContext, useReducer, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import { dashboardReducer, initialState } from '../utils/dashboardReducer'
import { getDashboardData } from '../services/api'
import API_CONFIG from '../config/api'

export const DashboardContext = createContext()

export function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  const socketRef = useRef(null)

  useEffect(() => {
    const fetchInitialDashboard = async () => {
      try {
        // Use the new consolidated dashboard endpoint
        const response = await getDashboardData()
        console.log('Dashboard data received:', response.data)
        dispatch({ type: 'UPDATE_ALL_DATA', payload: response.data })
      } catch (error) {
        console.error('Failed to fetch initial dashboard data:', error)
        // Fallback to individual endpoint calls if dashboard endpoint fails
        try {
          const fallbackResponse = await fetch(API_CONFIG.ENDPOINTS.DASHBOARD)
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            console.log('Fallback dashboard data received:', data)
            dispatch({ type: 'UPDATE_ALL_DATA', payload: data })
          }
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError)
        }
      }
    }

    // Fetch data immediately on mount
    fetchInitialDashboard()

    const connectSocket = () => {
      try {
        const socketUrl = API_CONFIG.BASE_URL
        socketRef.current = io(socketUrl, {
          transports: ['websocket', 'polling'],
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

        // Real-time update listeners
        socketRef.current.on('telemetry_update', (data) => {
          console.log('Telemetry update:', data)
          dispatch({ type: 'UPDATE_TELEMETRY', payload: data })
          fetchInitialDashboard()
        })

        socketRef.current.on('process_started', (data) => {
          console.log('Process started:', data)
          dispatch({ type: 'UPDATE_PROCESS', payload: data })
          fetchInitialDashboard()
        })

        socketRef.current.on('process_ended', (data) => {
          console.log('Process ended:', data)
          dispatch({ type: 'UPDATE_PROCESS', payload: data })
          fetchInitialDashboard()
        })

        socketRef.current.on('defect_detected', (data) => {
          console.log('Defect detected:', data)
          dispatch({ type: 'ADD_DEFECT', payload: data })
          fetchInitialDashboard()
        })
      } catch (error) {
        console.error('Failed to connect Socket.IO:', error)
      }
    }

    connectSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.off('telemetry_update')
        socketRef.current.off('process_started')
        socketRef.current.off('process_ended')
        socketRef.current.off('defect_detected')
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
