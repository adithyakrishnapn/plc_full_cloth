/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export const API_CONFIG = {
  // REST API
  BASE_URL: API_BASE,
  ENDPOINTS: {
    DASHBOARD: `${API_BASE}/api/dashboard`,
    PLC_DATA: `${API_BASE}/api/plc-data`,
    PLC_DATA_LATEST: `${API_BASE}/api/plc-data/latest`,
    PRODUCTION_LOGS: `${API_BASE}/api/production-logs`,
    ALERTS: `${API_BASE}/api/alerts`,
    ALERTS_ACTIVE: `${API_BASE}/api/alerts/active`,
    HEALTH: `${API_BASE}/health`,
  },

  // WebSocket
  WS_URL: `${WS_BASE}/dashboard`,

  // Request timeout (ms)
  TIMEOUT: 10000,

  // Retry configuration
  RETRY: {
    ATTEMPTS: 3,
    DELAY: 1000,
  },
}

/**
 * Fetch wrapper with timeout and retry logic
 */
export async function fetchWithTimeout(url, options = {}, retries = 3) {
  const timeout = options.timeout || API_CONFIG.TIMEOUT

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, API_CONFIG.RETRY.DELAY * (i + 1)))
    }
  }
}

export default API_CONFIG
