import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App.tsx'          // ← CAMBIA A ESTO
import './styles/index.css'              // ajusta si tu css está en otro lugar

const RootWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode;
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const CHUNK_RELOAD_GUARD_KEY = 'nutriu_chunk_reload_once';

const tryRecoverChunkLoad = (reason: string) => {
  const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === '1';
  if (alreadyReloaded) {
    console.error('[NutriU] Chunk load failed after reload:', reason);
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, '1');
  console.warn('[NutriU] Chunk load mismatch detected, reloading once...', reason);
  window.location.reload();
};

window.addEventListener('vite:preloadError', (event: Event) => {
  event.preventDefault();
  tryRecoverChunkLoad('vite:preloadError');
});

window.addEventListener('unhandledrejection', (event) => {
  const message = String((event.reason as any)?.message || event.reason || '');
  const isChunkError =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed');

  if (!isChunkError) return;

  event.preventDefault();
  tryRecoverChunkLoad(message);
});

if (isLocalhost && 'serviceWorker' in navigator) {
  // En localhost (dev y preview) eliminamos cualquier SW registrado para evitar
  // que un SW viejo secuestre requests de Supabase o assets con hashes anteriores.
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => undefined);

    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => undefined);
  });
}

if (!isLocalhost && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[NutriU] SW register failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RootWrapper>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </RootWrapper>,
)