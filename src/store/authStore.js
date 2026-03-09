import { create } from 'zustand';

export const useAuthStore = create(set => ({
  user:         null,
  token:        null,
  refreshToken: null,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ user, token, refreshToken: refreshToken ?? null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, refreshToken: null });
  },

  initFromStorage: () => {
    const token        = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const user         = JSON.parse(localStorage.getItem('user') ?? 'null');
    if (token) set({ token, refreshToken, user });
  },
}));
