import { create } from 'zustand';

export const useAuthStore = create(set => ({
  user:         null,
  token:        null,
  refreshToken: null,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('user',         JSON.stringify(user));
    localStorage.setItem('token',        token ?? '');
    localStorage.setItem('refreshToken', refreshToken ?? '');
    set({ user, token, refreshToken: refreshToken ?? null });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, refreshToken: null });
  },

  initFromStorage: () => {
    const raw          = localStorage.getItem('user');
    const user         = raw && raw !== 'undefined' ? JSON.parse(raw) : null;
    const token        = localStorage.getItem('token')        || null;
    const refreshToken = localStorage.getItem('refreshToken') || null;
    if (user) set({ user, token, refreshToken });
  },
}));