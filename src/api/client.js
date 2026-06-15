import axios from 'axios';
import { useAuthStore } from '../store/authStore';


const BASE = (window.APP_CONFIG?.API_BASE_URL ?? '').replace(/\/$/, '');

const USER_SERVICE    = `${BASE}/user-service/api`;
const BANKING_SERVICE = `${BASE}/banking-service/api`;
const TRADING_SERVICE = `${BASE}/trading-service/api`;

const AUTH_BASE = USER_SERVICE;

const api = axios.create({
  baseURL: USER_SERVICE,

  headers: { 'Content-Type': 'application/json' },
});

export const bankingApi = axios.create({
  baseURL: BANKING_SERVICE,
  headers: { 'Content-Type': 'application/json' },
});

export const tradingApi = axios.create({
  baseURL: TRADING_SERVICE,
  headers: { 'Content-Type': 'application/json' },
});

const INTERBANK_SERVICE = `${BASE}/interbank-service/api`;

export const interbankApi = axios.create({
  baseURL: INTERBANK_SERVICE,
  headers: { 'Content-Type': 'application/json' },
});

function attachToken(config) {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

api.interceptors.request.use(attachToken);
bankingApi.interceptors.request.use(attachToken);
tradingApi.interceptors.request.use(attachToken);
interbankApi.interceptors.request.use(attachToken);

let refreshPromise = null;

export function doRefresh() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken || refreshToken === 'undefined') {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    return Promise.reject(new Error('No refresh token'));
  }

  refreshPromise = axios
    .post(`${AUTH_BASE}/auth/refresh`, { refresh_token: refreshToken })
    .then(res => {
      const newToken   = res.data.token;
      const newRefresh = res.data.refresh_token || refreshToken;
      const currentUser = useAuthStore.getState().user;
      useAuthStore.getState().setAuth(currentUser, newToken, newRefresh);
      return newToken;
    })
    .catch(err => {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(err);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function attachRetry(axiosInstance) {
  return async err => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err.response?.data ?? err);
    }
    const authPaths = ['/login', '/refresh', '/activate', '/reset-password', '/forgot-password', '/register'];
    if (authPaths.some(p => original.url?.includes(p))) {
      return Promise.reject(err.response?.data ?? err);
    }
    original._retry = true;
    try {
      const newToken = await doRefresh();
      original.headers.Authorization = `Bearer ${newToken}`;
      return axiosInstance(original);
    } catch (refreshErr) {
      return Promise.reject(refreshErr);
    }
  };
}

api.interceptors.response.use(res => res.data, attachRetry(api));
bankingApi.interceptors.response.use(res => res.data, attachRetry(bankingApi));
tradingApi.interceptors.response.use(res => res.data, attachRetry(tradingApi));
interbankApi.interceptors.response.use(res => res.data, attachRetry(interbankApi));

export default api;