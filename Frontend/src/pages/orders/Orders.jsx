import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { listOrders } from '../../api/orders.api';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';
import Icon from '../../components/common/Icon';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`;
const daysUntil = (d) => {
  if (!d) return null;
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, hot: true };
  if (n === 0) return { text: 'Due today', hot: true };
  return { text: `${n}d left`, hot: n <= 4 };
};

const ACTIVE_STATUSES = ['awaiting_start', 'in_progress', 'delivered', 'revision_requested', 'in_dispute'];

const TABS = [
  { k: 'active',    l: 'Active' },
  { k: 'completed', l: 'Completed' },
  { k: 'cancelled', l: 'Cancelled' },
  { k: 'all',       l: 'All orders' },
];

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOrders({ limit: 100 });
      setOrders(res.data.data || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    active:    orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    all:       orders.length,
  };

  const filtered = orders.filter((o) => {
    if (tab === 'active')    return ACTIVE_STATUSES.includes(o.status);
    if (tab === 'completed') return o.status === 'completed';
    if (tab === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const isClient = user?.role === 'client';

  return (
    <div className="content">
      {/* header */}
      <div className="row between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Orders</div>
          <h1 className="display-3">Your active work</h1>
        </div>
        <button className="btn ghost" onClick={() => navigate(isClient ? '/freelancers' : '/jobs')}>
          {isClient ? 'Browse talent' : 'Find work'} <Icon name="arrow-right" size={13} />
        </button>
      </div>

      {/* stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active',    value: counts.active,    color: 'var(--accent)' },
          { label: 'Completed', value: counts.completed, color: 'var(--success)' },
          { label: 'Cancelled', value: counts.cancelled, color: 'var(--danger)' },
          { label: 'Total',     value: counts.all,       color: 'var(--ink-2)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass" style={{ padding: '16px 20px' }}>
            <div className="num" style={{ fontSize: 28, color, marginBottom: 2 }}>{value}</div>
            <div className="muted" style={{ fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.k} className={`tab ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>
            {t.l}{counts[t.k] > 0 ? ` (${counts[t.k]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 72, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <div className="muted" style={{ marginBottom: 14, fontSize: 14 }}>No {tab === 'all' ? '' : tab} orders yet.</div>
              {tab === 'active' && (
                <button className="btn amber" onClick={() => navigate(isClient ? '/freelancers' : '/jobs')}>
                  {isClient ? 'Post a brief' : 'Browse open work'} <Icon name="arrow-right" size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>{isClient ? 'Freelancer' : 'Client'}</th>
                  <th>Amount</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const due = daysUntil(o.deadline);
                  const counterpart = isClient
                    ? { name: o.freelancer_name, id: o.freelancer_id }
                    : { name: o.client_name, id: o.client_id };
                  return (
                    <tr
                      key={o.id}
                      className="hover-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.job_title}</div>
                        <div className="muted" style={{ fontSize: 11 }}>#{String(o.id).padStart(4, '0')}</div>
                      </td>
                      <td>
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                          <Avatar name={counterpart.name} size={24} />
                          <span style={{ fontSize: 12 }}>{counterpart.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="num amber-text" style={{ fontWeight: 600 }}>
                          {fmtMoney(o.amount)}
                        </span>
                      </td>
                      <td>
                        {due ? (
                          <span className={due.hot ? 'coral-text' : 'muted'} style={{ fontSize: 12, fontWeight: due.hot ? 600 : 400 }}>
                            {due.text}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>{fmtDate(o.deadline)}</span>
                        )}
                      </td>
                      <td><StatusPill status={o.status} /></td>
                      <td className="right">
                        <button
                          className="amber-text"
                          style={{ fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Orders;
