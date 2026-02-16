import axios from 'axios';

const normalizeApiRoot = (value) => {
    const trimmed = value.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${normalizeApiRoot(API_ROOT)}/api`;

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

// Error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.message);
        return Promise.reject(error);
    }
);

// Dashboard Functions - Consolidated
export const getDashboardData = () => api.get('/dashboard');

// Telemetry
export const getLatestData = () => api.get('/latest');

// Processes
export const getCurrentProcess = () => api.get('/process/current');
export const getLatestProcess = () => api.get('/process/latest');
export const getProcessHistory = (limit = 20) => api.get('/process/history');

// Defects
export const getDefects = () => api.get('/defects/current');
export const getDefectsByProcess = (processId) => api.get(`/defects/${processId}`);

// Statistics
export const getStats = () => api.get('/stats/today');

// Reports
export const getLatestReport = () => api.get('/reports/latest', { responseType: 'blob' });
export const getReportByProcess = (processId) => api.get(`/reports/process/${processId}`, { responseType: 'blob' });
export const getReportByDateRange = (from, to) => api.get('/reports/range', {
    params: { from, to },
    responseType: 'blob'
});

// Health Check
export const getHealth = () => api.get('/health');

export default api;
