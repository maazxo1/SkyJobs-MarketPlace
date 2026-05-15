import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../../components/common/Icon';
import { FlowChart } from '../../components/charts/Charts';
import Avatar from '../../components/common/Avatar';

const Login = () => {
  const navigate = useNavigate();
  const { loginUser, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    setError('');
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setError('Please enter your email address.'); return; }
    if (!form.password) { setError('Please enter your password.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await login(form);
      const { user, token } = res.data.data;
      loginUser(user, token);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.error;
      if (code === 'INVALID_CREDENTIALS') setError('Incorrect email or password. Please try again.');
      else if (code === 'ACCOUNT_BANNED')  setError('This account has been suspended. Contact support.');
      else setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="content auth-split" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100%' }}>
      {/* form side */}
      <div className="auth-form" style={{ padding: '64px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 540 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Welcome back</div>
        <h1 className="display-2" style={{ marginBottom: 10 }}>
          Sign <span className="display-italic">in</span>.
        </h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>
          Use your work email — we&apos;ll route you to the right dashboard.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'color-mix(in oklch, var(--danger) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--danger) 30%, transparent)', borderRadius: 10, fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="col gap-3" style={{ marginBottom: 22 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Email address</div>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} autoFocus
                placeholder="you@studio.com" className="field"
              />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" className="field" style={{ paddingRight: 40 }}
                />
                <button
                  type="button" onClick={() => setShowPwd((p) => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}
                >
                  <Icon name={showPwd ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="row gap-3" style={{ marginBottom: 22 }}>
            <button
              type="submit"
              className="btn amber"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'} {!loading && <Icon name="arrow-right" size={14} />}
            </button>
          </div>
        </form>

        <div className="muted" style={{ fontSize: 12 }}>
          Need an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register</Link>
        </div>
      </div>

      {/* art side — hidden on mobile via .auth-art */}
      <div className="auth-art" style={{ position: 'relative', padding: 32, overflow: 'hidden' }}>
        <div className="glass" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-xl)', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="row between">
            <span className="eyebrow">Live · SkyJobs</span>
            <span className="status active">412 active</span>
          </div>

          <div style={{ position: 'relative', margin: '0 -8px' }}>
            <div style={{ height: 280, borderRadius: 18, background: 'color-mix(in oklch, var(--ink) 5%, transparent)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center' }}>
              <span className="eyebrow">ambient editorial still</span>
            </div>
            <div className="glass glass-strong" style={{ position: 'absolute', left: 14, bottom: -22, padding: 16, borderRadius: 18, width: 240 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Active users now</div>
              <div className="num" style={{ fontSize: 30 }}>3,218</div>
              <FlowChart h={70} w={210} />
            </div>
          </div>

          <div style={{ marginTop: 36 }}>
            <h3 className="display-3" style={{ marginBottom: 8 }}>
              <span className="display-italic">&ldquo;Felt like</span> the brief was made for me.<span className="display-italic">&rdquo;</span>
            </h3>
            <div className="row gap-2 muted" style={{ fontSize: 12 }}>
              <Avatar name="Saba" size={24} /> Saba M. — motion designer · won 19 briefs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
