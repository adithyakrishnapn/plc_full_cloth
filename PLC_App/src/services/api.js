import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

export const getLatestData = () => api.get('/latest');
export const getCurrentProcess = () => api.get('/process/current');
export const getProcessHistory = () => api.get('/process/history');
export const getDefects = () => api.get('/defects/current');
export const getStats = () => api.get('/stats/today');

export default api;
