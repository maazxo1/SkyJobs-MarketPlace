import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);
let nextId = 0;

const ICON_PATH = {
  success: 'm5 12 4 4 10-9',
  error:   'M6 18 18 6M6 6l12 12',
  info:    'M12 16v-4M12 8h.01',
};

const COLORS = {
  success: { bg: 'var(--success)', text: '#fff' },
  error:   { bg: 'var(--danger)',  text: '#fff' },
  info:    { bg: 'var(--accent)',  text: 'oklch(0.18 0.01 70)' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
  };

  // Listen for network errors dispatched by the axios interceptor
  useEffect(() => {
    const handleNetworkEvent = (e) => addToast(e.detail?.message || 'Connection error', e.detail?.type || 'error');
    window.addEventListener('app:toast', handleNetworkEvent);
    return () => window.removeEventListener('app:toast', handleNetworkEvent);
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        right: 16,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 32px)',
      }}
        /* on wider screens, move back to corner */
        className="toast-stack"
      >
        {toasts.map((t) => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              className="slide-up"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px 12px 12px',
                borderRadius: 14,
                background: c.bg,
                color: c.text,
                boxShadow: `0 8px 24px -4px ${c.bg}60, 0 0 0 1px oklch(1 0 0 / 0.12) inset`,
                fontSize: 13, fontWeight: 500,
                minWidth: 240, maxWidth: 360,
                pointerEvents: 'auto',
              }}
            >
              {/* icon */}
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                background: 'oklch(0 0 0 / 0.15)',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICON_PATH[t.type]} />
                </svg>
              </div>

              {/* message */}
              <p style={{ flex: 1, lineHeight: 1.4, margin: 0 }}>{t.message}</p>

              {/* close */}
              <button
                onClick={() => remove(t.id)}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: 'oklch(0 0 0 / 0.15)', color: 'inherit',
                  display: 'grid', placeItems: 'center',
                  opacity: 0.7, transition: 'opacity .12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
