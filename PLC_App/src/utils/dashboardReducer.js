export const initialState = {
  stats: [
    { label: 'Machine Status', value: 'RUNNING', accent: 'text-emerald-400' },
    { label: 'Today Working Hours', value: '7.6 hrs' },
    { label: 'Today Production', value: '42 rolls' },
    { label: 'Defects Detected', value: '3' },
  ],
  runtimePoints: [
    { x: 0, y: 80, label: '6AM' },
    { x: 18, y: 60, label: '8AM' },
    { x: 36, y: 54, label: '10AM' },
    { x: 54, y: 40, label: '12PM' },
    { x: 72, y: 28, label: '2PM' },
    { x: 90, y: 20, label: '4PM' },
    { x: 108, y: 14, label: '6PM' },
  ],
  productionBars: [
    { month: 'Jan', value: 760 },
    { month: 'Feb', value: 680 },
    { month: 'Mar', value: 840 },
    { month: 'Apr', value: 920 },
    { month: 'May', value: 1020 },
    { month: 'Jun', value: 1120 },
  ],
  logRows: [
    { date: '12 Jun', batch: 'FX-24061', length: '120 m', defects: 1, status: 'OK' },
    { date: '12 Jun', batch: 'FX-24062', length: '110 m', defects: 0, status: 'OK' },
    { date: '12 Jun', batch: 'FX-24063', length: '95 m', defects: 2, status: 'CHECK' },
  ],
  lastUpdated: '12 Jun 2026 · 14:32',
  isConnected: false,
}

export const dashboardReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_STATS':
      return {
        ...state,
        stats: action.payload,
        lastUpdated: new Date().toLocaleString(),
      }

    case 'UPDATE_RUNTIME_POINTS':
      return {
        ...state,
        runtimePoints: action.payload,
        lastUpdated: new Date().toLocaleString(),
      }

    case 'UPDATE_PRODUCTION_BARS':
      return {
        ...state,
        productionBars: action.payload,
        lastUpdated: new Date().toLocaleString(),
      }

    case 'UPDATE_LOG_ROWS':
      return {
        ...state,
        logRows: action.payload,
        lastUpdated: new Date().toLocaleString(),
      }

    case 'UPDATE_SINGLE_STAT':
      return {
        ...state,
        stats: state.stats.map((stat) =>
          stat.label === action.payload.label
            ? { ...stat, value: action.payload.value }
            : stat
        ),
        lastUpdated: new Date().toLocaleString(),
      }

    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload,
      }

    case 'UPDATE_ALL_DATA':
      return {
        ...state,
        ...action.payload,
        lastUpdated: new Date().toLocaleString(),
      }

    default:
      return state
  }
}
