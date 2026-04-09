import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const bankingApi = axios.create({
  baseURL: import.meta.env.VITE_BANKING_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const tradingApi = axios.create({
  baseURL: import.meta.env.VITE_TRADING_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function attachToken(config) {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

api.interceptors.request.use(attachToken);
bankingApi.interceptors.request.use(attachToken);
tradingApi.interceptors.request.use(attachToken);

let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  failedQueue = [];
}

// Interceptor for main API (Core/Auth) - Handles standard 401 login logic
api.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config;

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err.response?.data ?? err);
    }

    const authPaths = ['/login', '/refresh', '/activate', '/reset-password', '/forgot-password', '/register'];
    if (authPaths.some(p => original.url?.includes(p))) {
      return Promise.reject(err.response?.data ?? err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || refreshToken === 'undefined') {
      isRefreshing = false;
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(err.response?.data ?? err);
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refresh_token: refreshToken });
      const newToken   = res.data.token;
      const newRefresh = res.data.refresh_token;
      const currentUser = useAuthStore.getState().user;
      useAuthStore.getState().setAuth(currentUser, newToken, newRefresh);

      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Interceptor for Banking API - Same refresh logic but NEVER forces logout on 401
// unless the REFRESH token call itself fails.
bankingApi.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config;

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err.response?.data ?? err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return bankingApi(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || refreshToken === 'undefined') {
      isRefreshing = false;
      // On bankingApi, if no refresh token, just fail the request, don't kill session
      return Promise.reject(err.response?.data ?? err);
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refresh_token: refreshToken });
      const newToken   = res.data.token;
      const newRefresh = res.data.refresh_token;
      const currentUser = useAuthStore.getState().user;
      useAuthStore.getState().setAuth(currentUser, newToken, newRefresh);

      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return bankingApi(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      // Only now, if refresh itself fails, we logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Interceptor for Trading API - Same refresh logic as bankingApi
tradingApi.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config;

    if ((err.response?.status !== 401 && err.response?.status !== 403) || original._retry) {
      return Promise.reject(err.response?.data ?? err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return tradingApi(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || refreshToken === 'undefined') {
      isRefreshing = false;
      return Promise.reject(err.response?.data ?? err);
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refresh_token: refreshToken });
      const newToken   = res.data.token;
      const newRefresh = res.data.refresh_token;
      const currentUser = useAuthStore.getState().user;
      useAuthStore.getState().setAuth(currentUser, newToken, newRefresh);

      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return tradingApi(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

