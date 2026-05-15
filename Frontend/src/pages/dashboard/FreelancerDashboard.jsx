import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBids, withdrawBid as withdrawBidApi } from '../../api/bids.api';
import { listOrders, startOrder } from '../../api/orders.api';
import { reviewOrder } from '../../api/reviews.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { FlowChart, Donut, Spark } from '../../components/charts/Charts';

const daysUntil = (d) => {
  if (!d) return null;
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, hot: true };
  if (n === 0) return { text: 'Due today', hot: true };
  return { text: `${n}d left`, hot: n <= 4 };
};
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`;

const ACTIVE_STATUSES = ['awaiting_start', 'in_progress', 'delivered', 'revision_requested', 'in_dispute'];

const StarRating = ({ value, onChange }) => (
  <div className="row gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)}
        style={{ color: n <= value ? 'var(--accent)' : 'var(--ink-4)', fontSize: 22, transition: 'color .1s' }}>★</button>
    ))}
  </div>
);

const FreelancerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [bids, setBids] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('work');
  const [acting, setActing] = useState(null);

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const [withdrawModal, setWithdrawModal] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [bRes, oRes] = await Promise.all([getMyBids(), listOrders({ limit: 50 })]);
      setBids(bRes.data.data || []);
      setOrders(oRes.data.data || []);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const active    = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completed = orders.filter((o) => o.status === 'completed');
  const pending   = bids.filter((b) => b.status === 'pending');
  const earned    = completed.reduce((s, o) => s + Number(o.freelancer_payout || 0), 0);
  const winRate   = bids.length ? Math.round((bids.filter((b) => b.status === 'accepted').length / bids.length) * 100) : 0;

  const handleStart = async (orderId) => {
    setActing(orderId);
    try {
      await startOrder(orderId);
      toast.success('Work started — client notified!');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start order');
    } finally {
      setActing(null);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawModal) return;
    try {
      await withdrawBidApi(withdrawModal.id);
      setWithdrawModal(null);
      await fetchData();
      toast.success('Proposal withdrawn');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to withdraw proposal');
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    try {
      await reviewOrder(reviewModal.id, { rating: reviewRating, comment: reviewComment });
      setReviewModal(null);
      setReviewRating(5);
      setReviewComment('');
      await fetchData();
      toast.success('Review submitted!');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.info('You\'ve already reviewed this order.');
        setReviewModal(null);
      } else {
        toast.error('Failed to submit review');
      }
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 100, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* hero */}
      <div className="glass" style={{ padding: 30, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Good to see you, {user?.name?.split(' ')[0]}</div>
            <h1 className="display-2" style={{ marginBottom: 14 }}>
              You have <span className="display-italic amber-text">{pending.length} live</span> proposal{pending.length !== 1 ? 's' : ''}.
            </h1>
            <p className="muted" style={{ maxWidth: 540 }}>
              {active.length} active order{active.length !== 1 ? 's' : ''} · {fmtMoney(earned)} lifetime earnings · {winRate}% win rate
            </p>
            <div className="row gap-3" style={{ marginTop: 18 }}>
              <button className="btn amber" onClick={() => navigate('/jobs')}>
                Find new work <Icon name="arrow-right" size={14} />
              </button>
              <button className="btn ghost" onClick={() => navigate(`/profile/${user?.id}`)}>
                Polish profile
              </button>
            </div>
          </div>
          <div style={{ width: 220, height: 160, position: 'relative' }}>
            <Donut value={winRate / 100} size={160} label="win rate" />
            <div style={{ position: 'absolute', bottom: -8, left: 16, right: -16 }}>
              <Spark w={200} h={32} />
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="row-stats" style={{ marginBottom: 28 }}>
        <StatCard
          label="Active orders" value={active.length}
          sub={active[0] ? `Next due ${fmtDate(active[0].deadline)}` : 'No active orders'}
          accent="var(--accent)"
        />
        <StatCard label="Open proposals" value={pending.length} sub={`${bids.length} total submitted`} />
        <StatCard
          label="Lifetime earnings" value={fmtMoney(earned)}
          sub="All completed orders"
          spark sparkData={[14,18,22,18,28,32,30,40]}
        />
        <StatCard
          label="Completed" value={completed.length}
          sub={`${winRate}% win rate`}
          spark sparkData={[8,12,9,18,14,22,28,32]}
        />
      </div>

      {/* tabs */}
      <div className="tabs" style={{ marginBottom: 22 }}>
        {[
          { k: 'work',      l: `Active work (${active.length})` },
          { k: 'proposals', l: `Proposals (${bids.length})` },
          { k: 'earnings',  l: 'Earnings' },
        ].map((t) => (
          <button key={t.k} className={`tab ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ── ACTIVE WORK ── */}
      {tab === 'work' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {active.map((o) => {
            const due = daysUntil(o.deadline);
            return (
              <div key={o.id} className="glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row between">
                  <span className="eyebrow">Order #{String(o.id).padStart(4, '0')}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="display-3" style={{ minHeight: 52 }}>{o.job_title}</div>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <Avatar name={o.client_name} size={24} />
                  <span style={{ fontSize: 12 }}>{o.client_name || 'Client'}</span>
                </div>
                <div className="row between" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div>
                    <div className="num" style={{ fontSize: 22, color: 'var(--accent)' }}>{fmtMoney(o.amount)}</div>
                    <div className="muted" style={{ fontSize: 10 }}>order value</div>
                  </div>
                  {due && (
                    <div className="right">
                      <div className={due.hot ? 'coral-text' : ''} style={{ fontSize: 12, fontWeight: 600 }}>{due.text}</div>
                      <div className="muted" style={{ fontSize: 10 }}>{fmtDate(o.deadline)}</div>
                    </div>
                  )}
                </div>

                {o.status === 'awaiting_start' && (
                  <button className="btn amber sm" disabled={acting === o.id}
                    onClick={() => handleStart(o.id)}>
                    {acting === o.id ? 'Starting…' : '▶ Start work'}
                  </button>
                )}
                {o.status === 'delivered' && (
                  <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
                    Awaiting client review
                  </div>
                )}
                {o.status === 'revision_requested' && (
                  <div className="muted" style={{ fontSize: 11, textAlign: 'center', color: 'var(--warning)' }}>
                    Revision requested
                  </div>
                )}

                <button className="btn ghost sm" onClick={() => navigate(`/orders/${o.id}`)}>
                  View order →
                </button>
              </div>
            );
          })}

          {/* completed needing review */}
          {completed.slice(0, Math.max(0, 3 - active.length)).map((o) => (
            <div key={o.id} className="glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row between">
                <span className="eyebrow">Order #{String(o.id).padStart(4, '0')}</span>
                <StatusPill status="completed" />
              </div>
              <div className="display-3" style={{ minHeight: 52 }}>{o.job_title}</div>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Avatar name={o.client_name} size={24} />
                <span style={{ fontSize: 12 }}>{o.client_name || 'Client'}</span>
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div className="num" style={{ fontSize: 22, color: 'var(--success)' }}>{fmtMoney(o.freelancer_payout)}</div>
              </div>
              <button className="btn success sm"
                onClick={() => { setReviewModal(o); setReviewRating(5); setReviewComment(''); }}>
                Leave review
              </button>
            </div>
          ))}

          <button className="glass"
            style={{ padding: 22, border: '1px dashed var(--border-strong)', display: 'grid', placeItems: 'center', minHeight: 220 }}
            onClick={() => navigate('/jobs')}>
            <div className="col gap-2" style={{ alignItems: 'center' }}>
              <Icon name="plus" size={20} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Find your next brief</div>
              <div className="muted" style={{ fontSize: 11 }}>Browse open work</div>
            </div>
          </button>
        </div>
      )}

      {/* ── PROPOSALS ── */}
      {tab === 'proposals' && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Brief</th><th>Bid</th><th>Days</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {bids.map((b) => (
                <tr key={b.id} className="hover-row">
                  <td>
                    <button onClick={() => navigate(`/jobs/${b.job_id}`)} style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.job_title || '—'}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{fmtDate(b.created_at)}</div>
                    </button>
                  </td>
                  <td><span className="num amber-text" style={{ fontWeight: 600 }}>{fmtMoney(b.amount)}</span></td>
                  <td><span className="num">{b.delivery_days}d</span></td>
                  <td><StatusPill status={b.status} /></td>
                  <td className="right">
                    {b.status === 'pending'
                      ? <button className="muted" onClick={() => setWithdrawModal(b)} style={{ fontSize: 12 }}>Withdraw</button>
                      : b.status === 'accepted'
                        ? <button className="amber-text" onClick={() => navigate('/orders')} style={{ fontSize: 12 }}>View order →</button>
                        : <button className="amber-text" onClick={() => navigate(`/jobs/${b.job_id}`)} style={{ fontSize: 12 }}>View →</button>
                    }
                  </td>
                </tr>
              ))}
              {bids.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }} className="muted">
                  No proposals yet. <button className="amber-text" onClick={() => navigate('/jobs')}>Browse briefs →</button>
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── EARNINGS ── */}
      {tab === 'earnings' && (() => {
        const sorted = [...completed].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
            <div className="glass" style={{ padding: 24 }}>
              <div className="row between" style={{ marginBottom: 16 }}>
                <h3 className="h-section">Earnings over time</h3>
                <span className="muted" style={{ fontSize: 12 }}>{completed.length} completed</span>
              </div>
              {sorted.length > 1 ? (
                <>
                  <FlowChart h={220} data={sorted.map((o) => Number(o.freelancer_payout || 0))} />
                  <div className="row between" style={{ marginTop: 14 }}>
                    {sorted.map((o, i) => (
                      <span key={i} className="muted" style={{ fontSize: 10 }}>
                        {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: 220, display: 'grid', placeItems: 'center' }}>
                  <p className="muted" style={{ fontSize: 13 }}>No earnings data yet.</p>
                </div>
              )}
            </div>
            <div className="glass" style={{ padding: 24 }}>
              <h3 className="h-section" style={{ marginBottom: 16 }}>Recent payouts</h3>
              <div className="col gap-3">
                {completed.slice(0, 4).map((o, i) => (
                  <div key={o.id} className="row between" style={{ paddingBottom: 12, borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{o.client_name || 'Client'}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{fmtDate(o.updated_at || o.created_at)}</div>
                    </div>
                    <span className="num amber-text">{fmtMoney(o.freelancer_payout)}</span>
                  </div>
                ))}
                {completed.length === 0 && (
                  <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 24 }}>No completed orders yet.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Review modal ── */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Leave a review" width={460}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>Share your experience on this order.</p>
        <div className="col gap-3">
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Rating</div>
            <StarRating value={reviewRating} onChange={setReviewRating} />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Comment</div>
            <textarea className="field" rows={4} value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Describe your experience…" />
          </div>
        </div>
        <div className="row gap-2" style={{ marginTop: 22 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setReviewModal(null)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={reviewLoading} onClick={handleReviewSubmit}>
            {reviewLoading ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </Modal>

      {/* ── Withdraw modal ── */}
      <Modal open={!!withdrawModal} onClose={() => setWithdrawModal(null)} title="Withdraw proposal?">
        <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
          This will withdraw your proposal on <strong>{withdrawModal?.job_title}</strong>.
        </p>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setWithdrawModal(null)}>Keep it</button>
          <button className="btn danger" style={{ flex: 1 }} onClick={handleWithdraw}>Withdraw</button>
        </div>
      </Modal>
    </div>
  );
};

export default FreelancerDashboard;
