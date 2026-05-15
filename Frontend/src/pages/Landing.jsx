import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Icon from '../components/common/Icon';
import Avatar from '../components/common/Avatar';
import StatusPill from '../components/common/StatusPill';
import { getJobs, getCategories } from '../api/jobs.api';
import { getPublicStats } from '../api/stats.api';

const Landing = () => {
  const navigate = useNavigate();
  const [jobs, setJobs]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats]       = useState(null);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    getJobs({ limit: 4, status: 'open', sort: 'created_at', order: 'desc' })
      .then((r) => setJobs(r.data.data || []))
      .catch((err) => console.error('[Landing] jobs fetch failed:', err?.response?.data || err?.message))
      .finally(() => setJobsLoading(false));
    getCategories()
      .then((r) => setCategories(r.data.data || []))
      .catch((err) => console.error('[Landing] categories fetch failed:', err?.response?.data || err?.message));
    getPublicStats()
      .then((r) => setStats(r.data.data))
      .catch((err) => console.error('[Landing] stats fetch failed:', err?.response?.data || err?.message));
  }, []);

  const fmtCount = (n) => {
    if (n == null) return '—';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <div className="content">
      {/* hero */}
      <div className="glass" style={{ padding: '44px 44px 36px', overflow: 'hidden', position: 'relative', borderRadius: 'var(--r-xl)' }}>
        <div className="row between" style={{ marginBottom: 28, alignItems: 'flex-start' }}>
          <div className="eyebrow">A marketplace for independent work</div>
          <div className="row gap-2">
            <button className="btn ghost sm" onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn amber sm" onClick={() => navigate('/register')}>Get started</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center' }}>
          <div>
            <h1 className="display-1" style={{ marginBottom: 20 }}>
              Find the <span className="display-italic">right</span> brief.<br />
              Bid on the <span className="display-italic">right</span> work.
            </h1>
            <p className="lead" style={{ marginBottom: 28 }}>
              SkyJobs is a transparent freelance marketplace — clients post briefs, freelancers compete on craft and price, and contracts are spun up the moment a bid is accepted.
            </p>
            <div className="row gap-3 wrap">
              <button className="btn amber lg" onClick={() => navigate('/jobs')}>
                Browse open briefs <Icon name="arrow-right" size={14} />
              </button>
              <button className="btn ghost lg" onClick={() => navigate('/register')}>Post a job</button>
            </div>

            <div className="row gap-6" style={{ marginTop: 36, color: 'var(--ink-3)', fontSize: 11 }}>
              <div className="row gap-2">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                {fmtCount(stats?.freelancer_count)} freelancers
              </div>
              <div className="row gap-2">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                {fmtCount(stats?.open_job_count)} open briefs
              </div>
              {stats?.avg_rating && (
                <div className="row gap-2">
                  <Icon name="star" size={12} />
                  {stats.avg_rating.toFixed(1)} avg rating
                </div>
              )}
            </div>
          </div>

          {/* live stats panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="glass glass-strong" style={{ padding: 20, borderRadius: 'var(--r-lg)' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Platform at a glance</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Freelancers',  value: fmtCount(stats?.freelancer_count), icon: 'users'     },
                  { label: 'Open briefs',  value: fmtCount(stats?.open_job_count),   icon: 'briefcase' },
                  { label: 'Completed',    value: fmtCount(stats?.completed_contracts), icon: 'check'  },
                  { label: 'Avg rating',   value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : '—', icon: 'star' },
                ].map((s) => (
                  <div key={s.label} style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: 'color-mix(in oklch, var(--ink) 4%, transparent)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--ink-3)' }}>
                      <Icon name={s.icon} size={12} />
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</span>
                    </div>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* how it works */}
      <div style={{ marginTop: 56 }}>
        <div className="row between" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow">How it works</div>
            <h2 className="h-section">Three steps. No middlemen.</h2>
          </div>
          <button className="btn ghost sm" onClick={() => navigate('/jobs')}>See live briefs</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { n: '01', t: 'Post a brief', b: 'Clients write a short brief — scope, budget range, deadline. We surface it to the right talent in minutes.' },
            { n: '02', t: 'Compete on craft', b: 'Freelancers submit a single bid each: amount, delivery window, and a short cover letter. No spam, no auto-bids.' },
            { n: '03', t: 'Sign the moment you agree', b: 'Accepting a bid auto-creates a contract with the agreed amount + deadline, locking the terms for both parties.' },
          ].map((s) => (
            <div key={s.n} className="glass" style={{ padding: 24, minHeight: 180 }}>
              <div className="num" style={{ fontSize: 34, color: 'var(--accent)', marginBottom: 12, letterSpacing: '-0.04em', fontWeight: 700 }}>{s.n}</div>
              <h3 className="display-3" style={{ marginBottom: 10 }}>{s.t}</h3>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{s.b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* live briefs preview */}
      <div style={{ marginTop: 64 }}>
        <div className="row between" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow">Live briefs</div>
            <h2 className="h-section">
              {stats?.open_job_count
                ? `${fmtCount(stats.open_job_count)} open right now`
                : 'A taste of what\'s open'}
            </h2>
          </div>
          <button className="btn ghost sm" onClick={() => navigate('/jobs')}>
            All briefs <Icon name="arrow-right" size={12} />
          </button>
        </div>

        {jobsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel" style={{ height: 160, borderRadius: 'var(--r-lg)' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 14, marginBottom: 16 }}>No open briefs right now — check back soon.</div>
            <button className="btn amber sm" onClick={() => navigate('/register')}>Post the first brief</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {jobs.map((j) => (
              <button
                key={j.id}
                className="glass"
                style={{ padding: 22, textAlign: 'left', display: 'block' }}
                onClick={() => navigate(`/jobs/${j.id}`)}
              >
                <div className="row between" style={{ marginBottom: 10 }}>
                  <span className="eyebrow">{j.category_name || j.category || 'Brief'}</span>
                  <StatusPill status="open" />
                </div>
                <div className="display-3" style={{ marginBottom: 10 }}>{j.title}</div>
                <p className="muted line-clamp-2" style={{ fontSize: 12, marginBottom: 14, minHeight: 36 }}>{j.description}</p>
                <div className="row between">
                  <div className="row gap-2 wrap">
                    {(j.skills_required || j.skills || []).slice(0, 3).map((s) => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>
                  <div className="num amber-text" style={{ fontWeight: 600, fontSize: 14 }}>
                    ${Math.round(j.budget_min / 1000)}k–${Math.round(j.budget_max / 1000)}k
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* categories */}
      {categories.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Categories</div>
          <div className="row gap-2 wrap">
            {categories.map((c) => (
              <button key={c.id} className="chip" onClick={() => navigate('/jobs')}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* footer */}
      <div className="row between" style={{ marginTop: 72, padding: '28px 0 8px', borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>SkyJobs</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>© 2026 · Built for independents.</div>
        </div>
        <div className="row gap-6 muted" style={{ fontSize: 11 }}>
          <span>About</span><span>Briefs</span><span>Talent</span><span>Pricing</span>
        </div>
      </div>
    </div>
  );
};

export default Landing;
