import axios from 'axios';

const normalizeApiRoot = (value) => {
    const trimmed = value.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${normalizeApiRoot(API_ROOT)}/api`;

const api = axios.create({
    baseURL: API_URL,
});

export const getLatestData = () => api.get('/latest');
export const getCurrentProcess = () => api.get('/process/current');
export const getProcessHistory = () => api.get('/process/history');
export const getDefects = () => api.get('/defects/current');
export const getStats = () => api.get('/stats/today');

export default api;
