import axios from 'axios';
import { getToken, clearToken } from '../lib/auth';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const isAuthRoute = url.startsWith('/auth/');
        if (error.response?.status === 401 && !isAuthRoute) {
            clearToken();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default api;
