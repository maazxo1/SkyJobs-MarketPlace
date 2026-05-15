import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../../components/common/Icon';

const Register = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loginUser, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState(params.get('role') || 'freelancer');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const clearFieldError = (field) =>
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const handleChange = (e) => {
    clearFieldError(e.target.name);
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email.';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await register({ ...form, role });
      const { user, token } = res.data.data;
      loginUser(user, token);
      toast.success('Account created! Welcome to SkyJobs.');
      navigate('/dashboard');
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.error;
      if (code === 'EMAIL_EXISTS') setErrors({ email: 'This email is already registered. Try signing in.' });
      else setErrors({ _form: msg || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="content auth-split" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100%' }}>
      {/* form side */}
      <div className="auth-form" style={{ padding: '64px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 540 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>New to SkyJobs</div>
        <h1 className="display-2" style={{ marginBottom: 10 }}>
          Create your <span className="display-italic">account</span>.
        </h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
          Pick a role. You can switch later from your profile.
        </p>

        {/* role selector */}
        <div className="row gap-2" style={{ marginBottom: 22, padding: 4, border: '1px solid var(--border)', borderRadius: 14, width: 'fit-content' }}>
          {[
            { k: 'freelancer', l: 'Freelancer', s: 'I bid on briefs' },
            { k: 'client',     l: 'Client',     s: 'I post briefs' },
          ].map((r) => (
            <button
              key={r.k} type="button" onClick={() => setRole(r.k)}
              style={{
                padding: '10px 18px', borderRadius: 10,
                background: role === r.k ? 'var(--ink)' : 'transparent',
                color: role === r.k ? 'var(--bg)' : 'var(--ink-2)',
                transition: 'all .15s ease',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.l}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{r.s}</div>
            </button>
          ))}
        </div>

        {errors._form && (
          <div style={{ padding: '10px 14px', background: 'color-mix(in oklch, var(--danger) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--danger) 30%, transparent)', borderRadius: 10, fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
            {errors._form}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="col gap-3" style={{ marginBottom: 22 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Full name</div>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                autoFocus placeholder="Jane Smith" className="field" />
              {errors.name && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.name}</div>}
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Email address</div>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@studio.com" className="field" />
              {errors.email && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.email}</div>}
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Password</div>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="Min. 8 characters" className="field" />
              {errors.password && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.password}</div>}
            </div>
          </div>

          <button
            type="submit" className="btn amber" style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'} {!loading && <Icon name="arrow-right" size={14} />}
          </button>
        </form>

        <div className="muted" style={{ fontSize: 12, marginTop: 22 }}>
          Already on SkyJobs?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>

      {/* art side — hidden on mobile via .auth-art */}
      <div className="auth-art" style={{ position: 'relative', padding: 32, overflow: 'hidden' }}>
        <div className="glass" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-xl)', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="eyebrow">Join 12,000+ independents</div>

          <div style={{ marginTop: 'auto', paddingTop: 40 }}>
            {[
              { n: '01', t: 'Post or find a brief', b: 'Clients post scope + budget. Freelancers discover briefs matched to their skills.' },
              { n: '02', t: 'Bid on craft, not volume', b: 'One clear proposal per freelancer — no spam, no race to the bottom.' },
              { n: '03', t: 'Contract auto-generated', b: 'Accept a bid and the contract terms are locked in instantly.' },
            ].map((s) => (
              <div key={s.n} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <div className="row gap-3">
                  <div className="num amber-text" style={{ fontSize: 18, fontWeight: 600, width: 28, flexShrink: 0 }}>{s.n}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.t}</div>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{s.b}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
