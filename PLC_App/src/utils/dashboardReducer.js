export const initialState = {
  stats: [
    { label: 'Machine Status', value: 'IDLE', accent: 'text-emerald-400' },
    { label: 'Today Working Hours', value: '0 hrs' },
    { label: 'Today Production', value: '0 rolls' },
    { label: 'Defects Detected', value: '0' },
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
    { month: 'Jan', value: 0 },
    { month: 'Feb', value: 0 },
    { month: 'Mar', value: 0 },
    { month: 'Apr', value: 0 },
    { month: 'May', value: 0 },
    { month: 'Jun', value: 0 },
  ],
  logRows: [],
  lastUpdated: new Date().toLocaleString(),
  isConnected: false,
  // Dashboard data
  latest: null,
  currentProcess: null,
  processHistory: [],
  currentDefects: [],
  dashboardStats: {
    todayProduction: 0,
    totalDefectsToday: 0,
    totalRunningTime: 0,
    totalDowntime: 0,
    utilizationPercent: 0,
  },
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

    case 'UPDATE_ALL_DATA': {
      // Parse consolidated dashboard data from server
      const payload = action.payload
      
      // Update stats from dashboard stats
      const dashboardStats = payload.stats || state.dashboardStats
      const utilizationPercent = dashboardStats.utilizationPercent || 0
      
      const updatedStats = [
        { 
          label: 'Machine Status', 
          value: payload.latest?.machineStatus || payload.latest?.machineRunning ? 'RUNNING' : 'STOPPED', 
          accent: (payload.latest?.machineStatus === 'RUNNING' || payload.latest?.machineRunning) ? 'text-emerald-400' : 'text-gray-400' 
        },
        { label: 'Today Working Hours', value: `${Math.floor((dashboardStats.totalRunningTime || 0) / 60)} hrs` },
        { label: 'Today Production', value: `${Math.floor(dashboardStats.todayProduction || 0)} m` },
        { 
          label: 'Utilization', 
          value: `${utilizationPercent}%`,
          accent: Number(utilizationPercent) > 80 ? 'text-emerald-400' : Number(utilizationPercent) > 60 ? 'text-amber-300' : 'text-slate-100'
        },
      ]

      // Process history into log rows
      const logRows = (payload.processHistory || []).slice(0, 10).map((process) => ({
        date: process.endTime ? new Date(process.endTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : (process.startTime ? new Date(process.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'),
        batch: process.processId || 'N/A',
        length: `${Math.floor(process.production || process.fabricProcessed || 0)} m`,
        defects: payload.currentDefects?.filter(d => d.processId === process.processId).length || 0,
        status: 'OK',
      }))

      return {
        ...state,
        stats: updatedStats,
        runtimePoints: payload.runtimePoints || state.runtimePoints,
        productionBars: payload.productionBars || state.productionBars,
        logRows: logRows.length > 0 ? logRows : state.logRows,
        latest: payload.latest || state.latest,
        currentProcess: payload.currentProcess || state.currentProcess,
        processHistory: payload.processHistory || state.processHistory,
        currentDefects: payload.currentDefects || state.currentDefects,
        dashboardStats: dashboardStats,
        lastUpdated: new Date().toLocaleString(),
      }
    }

    case 'UPDATE_TELEMETRY':
      return {
        ...state,
        latest: action.payload,
        stats: state.stats.map((stat) =>
          stat.label === 'Machine Status'
            ? { ...stat, value: action.payload.machineStatus, accent: action.payload.machineStatus === 'RUNNING' ? 'text-emerald-400' : 'text-gray-400' }
            : stat
        ),
        lastUpdated: new Date().toLocaleString(),
      }

    case 'UPDATE_PROCESS':
      return {
        ...state,
        currentProcess: action.payload,
        lastUpdated: new Date().toLocaleString(),
      }

    case 'ADD_DEFECT':
      return {
        ...state,
        currentDefects: [action.payload, ...state.currentDefects],
        stats: state.stats.map((stat) =>
          stat.label === 'Defects Detected'
            ? { ...stat, value: String(parseInt(stat.value) + 1) }
            : stat
        ),
        lastUpdated: new Date().toLocaleString(),
      }

    default:
      return state
  }
}
