import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
        background: 'var(--bg)', color: 'var(--ink)',
        fontFamily: 'var(--font-ui, system-ui, sans-serif)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, maxWidth: 420, lineHeight: 1.65, margin: 0 }}>
          An unexpected error occurred. Our team has been notified. You can try
          refreshing the page — if the problem persists, please contact support.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14,
            }}
          >
            Refresh page
          </button>
          <button
            onClick={() => { this.setState({ crashed: false, error: null }); window.location.href = '/'; }}
            style={{
              padding: '10px 22px', borderRadius: 999, cursor: 'pointer',
              background: 'transparent', color: 'var(--ink-2)', fontWeight: 600, fontSize: 14,
              border: '1px solid var(--border)',
            }}
          >
            Go home
          </button>
        </div>
      </div>
    );
  }
}
