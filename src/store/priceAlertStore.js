import { create } from 'zustand';

export const usePriceAlertStore = create(set => ({
  version: 0,
  bump: () => set(s => ({ version: s.version + 1 })),
}));
