import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';
import App from './App.jsx';

// Forward axios network events → app:toast (debounced).
// ToastProvider listens for app:toast and surfaces them as toasts.
let lastOfflineToast = 0;
window.addEventListener('api:offline', (e) => {
  const now = Date.now();
  if (now - lastOfflineToast < 8000) return;
  lastOfflineToast = now;
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: { type: 'error', message: e.detail?.message || 'Connection lost. Please try again.' },
  }));
});

let lastServerErrorToast = 0;
window.addEventListener('api:servererror', (e) => {
  const now = Date.now();
  if (now - lastServerErrorToast < 8000) return;
  lastServerErrorToast = now;
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: { type: 'error', message: e.detail?.message || 'Server error. Please try again later.' },
  }));
});

// Keep the Render free-tier server warm — ping /health every 10 min so it never spins down.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const keepAlive = () => fetch(`${API_BASE}/health`, { method: 'GET' }).catch(() => {});
keepAlive(); // ping immediately on page load
setInterval(keepAlive, 10 * 60 * 1000);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
