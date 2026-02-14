/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

const normalizeApiRoot = (value) => {
  const trimmed = value.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

const API_ROOT = import.meta.env.VITE_API_URL
const API_BASE = normalizeApiRoot(API_ROOT)
const WS_BASE = import.meta.env.VITE_WS_URL

export const API_CONFIG = {
  // REST API
  BASE_URL: API_BASE,
  ENDPOINTS: {
    LATEST: `${API_BASE}/api/latest`,
    PROCESS_CURRENT: `${API_BASE}/api/process/current`,
    PROCESS_LATEST: `${API_BASE}/api/process/latest`,
    PROCESS_HISTORY: `${API_BASE}/api/process/history`,
    DEFECTS: `${API_BASE}/api/defects/current`,
    STATS: `${API_BASE}/api/stats/today`,
    DASHBOARD: `${API_BASE}/api/dashboard`,
    REPORT_LATEST: `${API_BASE}/api/reports/latest`,
    REPORT_RANGE: `${API_BASE}/api/reports/range`,
    // Legacy mappings (best effort)
    PLC_DATA: `${API_BASE}/api/process/history`,
    PLC_DATA_LATEST: `${API_BASE}/api/latest`,
    PRODUCTION_LOGS: `${API_BASE}/api/process/history`,
    ALERTS: `${API_BASE}/api/defects/current`,
    ALERTS_ACTIVE: `${API_BASE}/api/defects/current`,
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
