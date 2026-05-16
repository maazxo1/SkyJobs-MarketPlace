import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobs, createJob, getCategories, getJobBids } from '../../api/jobs.api';
import { listOrders, approveOrder, requestRevision } from '../../api/orders.api';
import { reviewOrder } from '../../api/reviews.api';
import { acceptBid, rejectBid } from '../../api/bids.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { FlowChart } from '../../components/charts/Charts';

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
        style={{ color: n <= value ? 'var(--accent)' : 'var(--ink-4)', fontSize: 22 }}>★</button>
    ))}
  </div>
);

const EMPTY_JOB = { title: '', description: '', category_id: '', budget_min: '', budget_max: '', deadline: '', skills: '' };

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [jobs, setJobs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('briefs');
  const [acting, setActing] = useState(null); // orderId being acted on

  /* bid review */
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobBids, setJobBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);

  /* review modal */
  const [reviewModal, setReviewModal] = useState(null); // order object
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  /* revision modal */
  const [revisionModal, setRevisionModal] = useState(null); // order object
  const [revisionMsg, setRevisionMsg] = useState('');

  /* new job modal */
  const [jobModal, setJobModal] = useState(false);
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [jobSaving, setJobSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jRes, oRes, catRes] = await Promise.all([
        getJobs({ client_id: user?.id }),
        listOrders({ limit: 50 }),
        getCategories(),
      ]);
      setJobs(jRes.data.data || []);
      setOrders(oRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  useEffect(() => {
    const handler = () => setJobModal(true);
    window.addEventListener('open-new-job', handler);
    return () => window.removeEventListener('open-new-job', handler);
  }, []);

  const loadBids = async (job) => {
    setSelectedJob(job);
    setBidsLoading(true);
    try {
      const res = await getJobBids(job.id);
      setJobBids(res.data.data || []);
    } catch {
      toast.error('Failed to load bids');
    } finally {
      setBidsLoading(false);
    }
  };

  const handleAcceptBid = async (bidId) => {
    try {
      await acceptBid(bidId);
      toast.success('Bid accepted — order created');
      await fetchData();
      if (selectedJob) {
        const res = await getJobBids(selectedJob.id);
        setJobBids(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept bid');
    }
  };

  const handleRejectBid = async (bidId) => {
    try {
      await rejectBid(bidId);
      toast.success('Bid declined');
      if (selectedJob) {
        const res = await getJobBids(selectedJob.id);
        setJobBids(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to decline bid');
    }
  };

  const handleApprove = async (orderId) => {
    setActing(orderId);
    try {
      await approveOrder(orderId);
      toast.success('Delivery approved — order complete!');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActing(null);
    }
  };

  const handleRevisionSubmit = async () => {
    if (!revisionModal || !revisionMsg.trim()) return;
    setActing(revisionModal.id);
    try {
      await requestRevision(revisionModal.id, { feedback: revisionMsg });
      toast.success('Revision requested');
      setRevisionModal(null);
      setRevisionMsg('');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setActing(null);
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

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setJobSaving(true);
    try {
      const { skills, ...rest } = jobForm;
      await createJob({
        ...rest,
        category_id: Number(rest.category_id),
        budget_min: Number(rest.budget_min),
        budget_max: Number(rest.budget_max),
        skills_required: skills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Brief posted!');
      setJobModal(false);
      setJobForm(EMPTY_JOB);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post brief');
    } finally {
      setJobSaving(false);
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

  const activeOrders    = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const pendingBidsTotal = jobs.reduce((s, j) => s + (j.bid_count || 0), 0);
  const spent = orders.reduce((s, o) => s + Number(o.amount), 0);

  return (
    <div className="content">
      {/* hero */}
      <div className="glass" style={{ padding: 30, marginBottom: 24 }}>
        <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Welcome back, {user?.name?.split(' ')[0]}</div>
            <h1 className="display-2" style={{ marginBottom: 12 }}>
              <span className="display-italic amber-text">{jobs.length} brief{jobs.length !== 1 ? 's' : ''}</span> posted.
            </h1>
            <p className="muted" style={{ maxWidth: 540 }}>
              {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''} · {fmtMoney(spent)} committed · {completedOrders.length} completed
            </p>
          </div>
          <div className="row gap-3">
            <button className="btn amber" onClick={() => setJobModal(true)}>
              <Icon name="plus" size={14} /> Post a brief
            </button>
            <button className="btn ghost" onClick={() => navigate('/freelancers')}>Browse talent</button>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="row-stats" style={{ marginBottom: 28 }}>
        <StatCard label="Open briefs"       value={jobs.length}             sub="all accepting bids"        accent="var(--accent)" />
        <StatCard label="Pending proposals" value={pendingBidsTotal}        sub="needs your review" />
        <StatCard label="Active orders"     value={activeOrders.length}     sub="across your freelancers" />
        <StatCard label="Total committed"   value={fmtMoney(spent)}         sub="all-time"                 spark sparkData={[20,28,22,30,40,38,46]} />
      </div>

      {/* tabs */}
      <div className="tabs" style={{ marginBottom: 22 }}>
        {[
          { k: 'briefs',  l: `My briefs (${jobs.length})` },
          { k: 'orders',  l: `Orders (${orders.length})` },
          { k: 'spend',   l: 'Spend pace' },
        ].map((t) => (
          <button key={t.k} className={`tab ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ── BRIEFS TAB ── */}
      {tab === 'briefs' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 28 }}>
          {/* bid inbox */}
          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row between" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <h3 className="h-section">{selectedJob ? `Proposals — ${selectedJob.title}` : 'Select a brief to review proposals'}</h3>
              {selectedJob && <button className="muted" style={{ fontSize: 12 }} onClick={() => setSelectedJob(null)}>← Back</button>}
            </div>
            {!selectedJob ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">
                Click a brief on the right to see its proposals.
              </div>
            ) : bidsLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading…</div>
            ) : jobBids.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">No proposals yet for this brief.</div>
            ) : (
              jobBids.map((b) => (
                <div key={b.id} style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                  <div className="row gap-3">
                    <Avatar name={b.freelancer_name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row between" style={{ marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.freelancer_name}</div>
                        <div className="num amber-text" style={{ fontWeight: 600 }}>{fmtMoney(b.amount)}</div>
                      </div>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                        {b.delivery_days}d delivery · <StatusPill status={b.status} />
                      </div>
                      <p className="muted line-clamp-2" style={{ fontSize: 12 }}>&ldquo;{b.cover_letter}&rdquo;</p>
                      {b.status === 'pending' && (
                        <div className="row gap-2" style={{ marginTop: 10 }}>
                          <button className="btn amber sm" onClick={() => handleAcceptBid(b.id)}>Accept</button>
                          <button className="btn ghost sm" onClick={() => handleRejectBid(b.id)}>Decline</button>
                          <button className="btn ghost sm" onClick={() => navigate(`/profile/${b.freelancer_id}`)}>Profile →</button>
                        </div>
                      )}
                      {b.status === 'accepted' && (
                        <div className="row gap-2" style={{ marginTop: 10 }}>
                          <span className="status accepted" style={{ fontSize: 11 }}>Accepted</span>
                          <button className="amber-text" style={{ fontSize: 12 }}
                            onClick={() => navigate('/orders')}>View order →</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* briefs list */}
          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row between" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <h3 className="h-section">My briefs</h3>
              <button className="btn ghost sm" onClick={() => setJobModal(true)}>
                <Icon name="plus" size={13} /> New
              </button>
            </div>
            {jobs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">
                No briefs yet. <button className="amber-text" onClick={() => setJobModal(true)}>Post your first →</button>
              </div>
            ) : jobs.map((j) => {
              const due = daysUntil(j.deadline);
              return (
                <button key={j.id} onClick={() => loadBids(j)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '14px 22px', borderBottom: '1px solid var(--border)',
                  background: selectedJob?.id === j.id ? 'color-mix(in oklch, var(--accent) 6%, transparent)' : 'transparent',
                  transition: 'background .15s',
                }}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{j.title}</div>
                    <span className="num amber-text" style={{ fontSize: 12, fontWeight: 600 }}>${Math.round(j.budget_max / 1000)}k</span>
                  </div>
                  <div className="row gap-3 muted" style={{ fontSize: 11 }}>
                    <span>{j.bid_count || 0} proposal{j.bid_count !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span className={due?.hot ? 'coral-text' : ''}>{due?.text || 'No deadline'}</span>
                    <span>·</span>
                    <StatusPill status={j.status} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {orders.map((o) => {
            const due = daysUntil(o.deadline);
            const isDelivered = o.status === 'delivered';
            return (
              <div key={o.id} className="glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row between">
                  <span className="eyebrow">Order #{String(o.id).padStart(4, '0')}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="display-3" style={{ minHeight: 52 }}>{o.job_title}</div>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <Avatar name={o.freelancer_name} size={24} />
                  <button onClick={() => navigate(`/profile/${o.freelancer_id}`)}
                    style={{ fontSize: 12, color: 'var(--accent)' }}>
                    {o.freelancer_name}
                  </button>
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

                {/* Quick actions */}
                {isDelivered && (
                  <div className="row gap-2">
                    <button className="btn success sm" style={{ flex: 1 }}
                      disabled={acting === o.id}
                      onClick={() => handleApprove(o.id)}>
                      {acting === o.id ? '…' : '✓ Approve'}
                    </button>
                    <button className="btn ghost sm"
                      onClick={() => { setRevisionModal(o); setRevisionMsg(''); }}>
                      Revise
                    </button>
                  </div>
                )}
                {o.status === 'completed' && (
                  <button className="btn amber sm"
                    onClick={() => { setReviewModal(o); setReviewRating(5); setReviewComment(''); }}>
                    <Icon name="star" size={12} /> Leave review
                  </button>
                )}
                {o.status === 'awaiting_start' && (
                  <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>Waiting for freelancer to start</div>
                )}

                <button className="btn ghost sm" onClick={() => navigate(`/orders/${o.id}`)}>
                  View full order →
                </button>
              </div>
            );
          })}
          {orders.length === 0 && (
            <div className="glass muted" style={{ padding: 48, textAlign: 'center', gridColumn: '1/-1', fontSize: 14 }}>
              No orders yet. Accept a bid on one of your briefs to create an order.
            </div>
          )}
        </div>
      )}

      {/* ── SPEND TAB ── */}
      {tab === 'spend' && (() => {
        const sortedCompleted = [...completedOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return (
          <div className="glass" style={{ padding: 24 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 className="h-section">Spend pace</h3>
              <span className="muted" style={{ fontSize: 12 }}>{fmtMoney(spent)} committed all-time</span>
            </div>
            {sortedCompleted.length > 1 ? (
              <>
                <FlowChart h={180} data={sortedCompleted.map((o) => Number(o.amount))} />
                <div className="row between" style={{ marginTop: 14 }}>
                  {sortedCompleted.map((o, i) => (
                    <span key={i} className="muted" style={{ fontSize: 10 }}>
                      {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 180, display: 'grid', placeItems: 'center' }}>
                <p className="muted" style={{ fontSize: 13 }}>Complete your first order to see spend data.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Review modal ── */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Leave a review" width={460}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
          Rate your experience with <strong>{reviewModal?.freelancer_name}</strong>.
          Reviews reveal once both parties submit.
        </p>
        <div className="col gap-3">
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Rating</div>
            <StarRating value={reviewRating} onChange={setReviewRating} />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Comment</div>
            <textarea className="field" rows={4} value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience…" />
          </div>
        </div>
        <div className="row gap-2" style={{ marginTop: 22 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setReviewModal(null)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={reviewLoading} onClick={handleReviewSubmit}>
            {reviewLoading ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </Modal>

      {/* ── Revision modal ── */}
      <Modal open={!!revisionModal} onClose={() => setRevisionModal(null)} title="Request revision" width={460}>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>What needs to change?</div>
            <textarea className="field" rows={4} value={revisionMsg}
              onChange={(e) => setRevisionMsg(e.target.value)}
              placeholder="Describe the changes you'd like…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setRevisionModal(null)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={!revisionMsg.trim() || acting !== null}
            onClick={handleRevisionSubmit}>
            Request revision
          </button>
        </div>
      </Modal>

      {/* ── New job modal ── */}
      <Modal open={jobModal} onClose={() => setJobModal(false)} title="Post a new brief" width={560}>
        <form onSubmit={handleCreateJob}>
          <div className="col gap-3" style={{ marginBottom: 22 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Title</div>
              <input className="field" placeholder="e.g. React dashboard for our SaaS app" value={jobForm.title}
                onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))} required />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Description</div>
              <textarea className="field" rows={4} placeholder="Describe the project scope, goals, and expectations…"
                value={jobForm.description} onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Category</div>
                <select className="field" value={jobForm.category_id}
                  onChange={(e) => setJobForm((p) => ({ ...p, category_id: e.target.value }))} required>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Deadline</div>
                <input type="date" className="field" value={jobForm.deadline}
                  onChange={(e) => setJobForm((p) => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Min budget ($)</div>
                <input type="number" className="field" placeholder="1000" value={jobForm.budget_min}
                  onChange={(e) => setJobForm((p) => ({ ...p, budget_min: e.target.value }))} required />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Max budget ($)</div>
                <input type="number" className="field" placeholder="5000" value={jobForm.budget_max}
                  onChange={(e) => setJobForm((p) => ({ ...p, budget_max: e.target.value }))} required />
              </div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>
                Required skills <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(comma-separated)</span>
              </div>
              <input className="field" placeholder="React, TypeScript, Node.js" value={jobForm.skills}
                onChange={(e) => setJobForm((p) => ({ ...p, skills: e.target.value }))} />
            </div>
          </div>
          <div className="row gap-2">
            <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => setJobModal(false)}>Cancel</button>
            <button type="submit" className="btn amber" style={{ flex: 1 }} disabled={jobSaving}>
              {jobSaving ? 'Posting…' : 'Post brief'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientDashboard;
