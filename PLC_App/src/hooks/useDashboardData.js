import { useContext } from 'react'
import { DashboardContext } from '../context/DashboardContext'

export const useDashboardData = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardProvider')
  }
  return context
}
