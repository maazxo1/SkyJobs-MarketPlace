import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 s — surface slow/dead server clearly
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // ── No response at all → server down / offline ──────────────
    if (!err.response) {
      window.dispatchEvent(new CustomEvent('api:offline', {
        detail: {
          message: err.code === 'ECONNABORTED'
            ? 'The request timed out. Please check your connection and try again.'
            : 'We\'re having trouble connecting to the server. Please try again in a moment.',
        },
      }));
      return Promise.reject(err);
    }

    // ── Session expired ──────────────────────────────────────────
    if (err.response.status === 401) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      if (hadToken) {
        window.location.href = '/login';
      }
    }

    // ── 5xx → emit a generic server-error event ──────────────────
    if (err.response.status >= 500) {
      window.dispatchEvent(new CustomEvent('api:servererror', {
        detail: { status: err.response.status },
      }));
    }

    return Promise.reject(err);
  }
);

export default api;
