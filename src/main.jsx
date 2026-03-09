import { StrictMode }    from 'react';
import { createRoot }    from 'react-dom/client';
import { useAuthStore }  from './store/authStore';
import App               from './App';
import './styles/variables.css';

if (import.meta.env.DEV) {
  await import('./api/mock');
}

useAuthStore.getState().initFromStorage();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
