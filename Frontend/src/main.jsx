import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
