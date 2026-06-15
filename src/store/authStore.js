import { create } from 'zustand';

export const useAuthStore = create(set => ({
  user:         null,
  token:        null,
  refreshToken: null,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, refreshToken: refreshToken ?? null });
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null, token: null, refreshToken: null });
  },

  initFromStorage: () => {
    const raw  = localStorage.getItem('user');
    const user = raw && raw !== 'undefined' ? JSON.parse(raw) : null;
    if (user) set({ user });
  },
}));