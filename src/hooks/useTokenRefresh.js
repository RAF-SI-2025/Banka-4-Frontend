import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { doRefresh } from '../api/client';

function parseJwtExp(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp * 1000;
  } catch {
    return null;
  }
}

/**
 
Proaktivno osvežava access token 60s pre isteka.
Poziva se u App.jsx jednom za celu aplikaciju.*/
export function useTokenRefresh() {
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    if (!token) return;

    const exp = parseJwtExp(token);
    if (!exp) return;

    const delay = exp - Date.now() - 60_000;

    async function tryRefresh() {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken || refreshToken === 'undefined') return;
      try {
        await doRefresh();
      } catch {
        // Ne radimo ništa — 401 interceptor će preuzeti ako zahtev padne
      }
    }

    if (delay <= 0) {
      tryRefresh();
      return;
    }

    const timer = setTimeout(tryRefresh, delay);
    return () => clearTimeout(timer);
  }, [token]);
}