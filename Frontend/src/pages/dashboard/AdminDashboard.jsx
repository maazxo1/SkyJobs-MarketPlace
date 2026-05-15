import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../api/admin.api';
import { useToast } from '../../context/ToastContext';
import Icon from '../../components/common/Icon';

const AdminDashboard = () => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((r) => setStats(r.data.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="content">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 100, borderRadius: 'var(--r-lg)' }} />
        ))}
      </div>
    </div>
  );

  const totalJobs = stats?.total_jobs || 1;

  return (
    <div className="content">
      {/* header */}
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: 'var(--danger)', marginBottom: 6 }}>Administration</div>
        <h1 className="display-2" style={{ marginBottom: 6 }}>
          Platform <span className="display-italic">overview</span>.
        </h1>
        <p className="muted">Real-time statistics and platform health.</p>
      </div>

      {/* stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { l: 'Total users',     v: stats?.total_users },
          { l: 'Total briefs',    v: stats?.total_jobs },
          { l: 'Proposals',       v: stats?.total_bids },
          { l: 'Contracts',       v: stats?.total_contracts },
        ].map((s) => (
          <div key={s.l} className="glass" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{s.l}</div>
            <div className="num amber-text" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1 }}>
              {s.v?.toLocaleString() ?? '—'}
            </div>
          </div>
        ))}
      </div>

      {/* jobs by status */}
      {stats?.jobs_by_status && (
        <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 18 }}>Briefs by status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {stats.jobs_by_status.map(({ status, count }) => {
              const pct = Math.round((Number(count) / totalJobs) * 100);
              return (
                <div key={status} className="glass" style={{ padding: 16 }}>
                  <div className="num" style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{count}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize', marginBottom: 10, color: 'var(--ink-2)' }}>
                    {status.replace('_', ' ')}
                  </div>
                  <div style={{ height: 4, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{pct}% of total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        <Link to="/admin" className="btn amber">
          Open admin panel <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
