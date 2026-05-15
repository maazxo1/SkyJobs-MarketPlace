import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJob, getJobBids, deleteJob, updateJob, getCategories } from '../../api/jobs.api';
import { acceptBid, rejectBid, submitBid } from '../../api/bids.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';

const daysUntil = (d) => {
  if (!d) return null;
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, hot: true };
  if (n === 0) return { text: 'Due today', hot: true };
  return { text: `${n}d left`, hot: n <= 4 };
};

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const StatBox = ({ label, value, hot }) => (
  <div className="glass" style={{ padding: '12px 16px', textAlign: 'center', flex: 1 }}>
    <div className={`num ${hot ? 'amber-text' : ''}`} style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{value}</div>
    <div className="muted" style={{ fontSize: 11 }}>{label}</div>
  </div>
);

const JobDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [bids, setBids] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bidModal, setBidModal] = useState(false);
  const [bidForm, setBidForm] = useState({ amount: '', delivery_days: '', cover_letter: '' });
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [myBid, setMyBid] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await getJob(id);
      const data = res.data.data;
      setJob(data);
      if (data.my_bid) setMyBid(data.my_bid);
    } catch {
      toast.error('Brief not found');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      const res = await getJobBids(id);
      setBids(res.data.data || []);
    } catch { /* not owner */ }
  };

  useEffect(() => {
    fetchJob();
    if (user) fetchBids();
    getCategories().then((r) => setCategories(r.data.data || [])).catch(() => {});
  }, [id, user]);

  const openEdit = () => {
    const skills = typeof job.skills_required === 'string'
      ? JSON.parse(job.skills_required)
      : (job.skills_required || []);
    setEditForm({
      title: job.title,
      description: job.description,
      category_id: job.category_id,
      location: job.location || '',
      budget_min: job.budget_min,
      budget_max: job.budget_max,
      deadline: job.deadline?.slice(0, 10),
      skills_required: skills.join(', '),
    });
    setEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateJob(id, {
        ...editForm,
        category_id: Number(editForm.category_id),
        budget_min: Number(editForm.budget_min),
        budget_max: Number(editForm.budget_max),
        skills_required: editForm.skills_required.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Brief updated');
      setEditModal(false);
      fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteJob(id);
      toast.success('Brief removed');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const handleAccept = async (bidId) => {
    try {
      await acceptBid(bidId);
      toast.success('Proposal accepted — contract created');
      fetchJob();
      fetchBids();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept');
    }
  };

  const handleReject = async (bidId) => {
    try {
      await rejectBid(bidId);
      toast.success('Proposal declined');
      fetchBids();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to decline');
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    if (bidForm.cover_letter.length < 50) { toast.error('Cover letter must be at least 50 characters.'); return; }
    setBidSubmitting(true);
    try {
      const res = await submitBid({
        job_id: Number(id),
        amount: Number(bidForm.amount),
        delivery_days: Number(bidForm.delivery_days),
        cover_letter: bidForm.cover_letter,
      });
      setMyBid(res.data.data);
      toast.success('Proposal submitted!');
      setBidModal(false);
      setBidForm({ amount: '', delivery_days: '', cover_letter: '' });
      fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit proposal');
    } finally {
      setBidSubmitting(false);
    }
  };

  if (loading) return (
    <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div className="skel" style={{ width: 48, height: 48, borderRadius: '50%' }} />
    </div>
  );

  const isOwner = user?.id === job?.client_id;
  const isFreelancer = user?.role === 'freelancer';
  const skills = typeof job.skills_required === 'string'
    ? JSON.parse(job.skills_required)
    : (job.skills_required || []);
  const due = daysUntil(job.deadline);
  const avgBid = bids.length > 0
    ? Math.round(bids.reduce((s, b) => s + Number(b.amount), 0) / bids.length)
    : null;

  return (
    <div className="content">
      {/* breadcrumb */}
      <div className="row gap-2 muted" style={{ fontSize: 12, marginBottom: 24 }}>
        <Link to="/jobs" style={{ color: 'var(--ink-3)' }}>Browse briefs</Link>
        <Icon name="chevron-right" size={12} />
        <span style={{ color: 'var(--ink-2)' }}>{job.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* left: main content */}
        <div className="col gap-4">

          {/* brief header */}
          <div className="glass" style={{ padding: 28 }}>
            <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row gap-3" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                  <span className="eyebrow">{job.category || job.category_name}</span>
                  <span className="muted" style={{ fontSize: 11 }}>· posted {fmtDate(job.created_at)}</span>
                  <span className={`status ${job.status === 'open' ? 'open' : job.status === 'closed' ? 'closed' : 'active'}`}>
                    {job.status}
                  </span>
                </div>
                <h1 className="display-2" style={{ marginBottom: 10, lineHeight: 1.15 }}>{job.title}</h1>
                <div className="row gap-2 muted" style={{ fontSize: 12 }}>
                  <Avatar name={job.client_name} size={20} />
                  <span>
                    Posted by{' '}
                    <Link to={`/profile/${job.client_id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {job.client_name}
                    </Link>
                  </span>
                </div>
              </div>
              {isOwner && job.status === 'open' && (
                <div className="row gap-2">
                  <button className="btn ghost sm" onClick={openEdit}>Edit brief</button>
                  <button className="btn ghost sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteModal(true)}>Delete</button>
                </div>
              )}
            </div>

            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              <StatBox label="Budget" value={`$${Math.round(job.budget_min / 1000)}–${Math.round(job.budget_max / 1000)}k`} hot />
              <StatBox label="Deadline" value={due ? due.text : fmtDate(job.deadline)} hot={due?.hot} />
              <StatBox label="Proposals" value={job.bid_count ?? 0} />
              {avgBid && <StatBox label="Avg bid" value={`$${(avgBid / 1000).toFixed(1)}k`} />}
            </div>
          </div>

          {/* description */}
          <div className="glass" style={{ padding: 28 }}>
            <div className="label" style={{ marginBottom: 14 }}>About this brief</div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--ink-2)', whiteSpace: 'pre-line' }}>{job.description}</p>

            {skills.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div className="label" style={{ marginBottom: 10 }}>Required skills</div>
                <div className="row gap-2 wrap">
                  {skills.map((s) => <span key={s} className="chip solid">{s}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* proposals — owner view */}
          {isOwner && (
            <div className="glass" style={{ padding: 28 }}>
              <div className="row between" style={{ marginBottom: 18 }}>
                <div className="label">Proposals</div>
                <span className="chip solid" style={{ minWidth: 24, justifyContent: 'center' }}>{bids.length}</span>
              </div>

              {bids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p className="muted" style={{ fontSize: 13 }}>No proposals yet. Share your brief to attract talent.</p>
                </div>
              ) : (
                <div className="col gap-3">
                  {bids.map((bid) => {
                    const bidSkills = typeof bid.skills === 'string'
                      ? (() => { try { return JSON.parse(bid.skills); } catch { return []; } })()
                      : (bid.skills || []);
                    return (
                      <div key={bid.id} className="glass" style={{ padding: 20 }}>
                        {/* top row: avatar + name + status */}
                        <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
                          <div className="row gap-3">
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <Avatar name={bid.freelancer_name} size={40} />
                              {bid.rating_avg > 0 && (
                                <div style={{
                                  position: 'absolute', bottom: -4, right: -4,
                                  background: 'var(--surface)', border: '1px solid var(--border)',
                                  borderRadius: 10, padding: '1px 5px', fontSize: 10, fontWeight: 700,
                                  color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 2,
                                }}>
                                  ★ {Number(bid.rating_avg).toFixed(1)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{bid.freelancer_name}</div>
                              <div className="row gap-2 muted" style={{ fontSize: 11, marginTop: 2 }}>
                                {bid.jobs_completed > 0 && (
                                  <span>{bid.jobs_completed} job{bid.jobs_completed !== 1 ? 's' : ''} done</span>
                                )}
                                {bid.jobs_completed > 0 && bid.hourly_rate && <span>·</span>}
                                {bid.hourly_rate && (
                                  <span className="amber-text" style={{ fontWeight: 600 }}>
                                    ${Number(bid.hourly_rate).toLocaleString()}/hr
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="right" style={{ flexShrink: 0 }}>
                            <div className="num amber-text" style={{ fontWeight: 700, fontSize: 16 }}>
                              ${Number(bid.amount).toLocaleString()}
                            </div>
                            <div className="muted" style={{ fontSize: 11 }}>{bid.delivery_days}d delivery</div>
                            <span className={`status ${bid.status === 'pending' ? 'open' : bid.status === 'accepted' ? 'active' : 'closed'}`}
                              style={{ marginTop: 4, display: 'inline-block' }}>
                              {bid.status}
                            </span>
                          </div>
                        </div>

                        {/* skills */}
                        {bidSkills.length > 0 && (
                          <div className="row gap-1" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                            {bidSkills.slice(0, 5).map((s) => (
                              <span key={s} className="chip" style={{ fontSize: 10 }}>{s}</span>
                            ))}
                            {bidSkills.length > 5 && (
                              <span className="chip muted" style={{ fontSize: 10 }}>+{bidSkills.length - 5}</span>
                            )}
                          </div>
                        )}

                        {/* cover letter */}
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, marginBottom: 14,
                          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          &ldquo;{bid.cover_letter}&rdquo;
                        </p>

                        {/* actions */}
                        {bid.status === 'pending' && (
                          <div className="row gap-2">
                            <button className="btn amber sm" onClick={() => handleAccept(bid.id)}>Accept proposal</button>
                            <button className="btn ghost sm" onClick={() => handleReject(bid.id)}>Decline</button>
                            <button className="btn ghost sm" onClick={() => navigate(`/profile/${bid.freelancer_id}`)}>
                              Profile →
                            </button>
                          </div>
                        )}
                        {bid.status === 'accepted' && (
                          <div className="row gap-2">
                            <span className="status active" style={{ fontSize: 11 }}>Accepted</span>
                            <button className="amber-text" style={{ fontSize: 12 }}
                              onClick={() => navigate('/orders')}>View order →</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* right: sticky panel */}
        <div className="col gap-3" style={{ position: 'sticky', top: 8 }}>

          {/* submit proposal */}
          {isAuthenticated && isFreelancer && job.status === 'open' && (
            myBid ? (
              <div className="glass" style={{ padding: 22, borderLeft: '3px solid var(--success)' }}>
                <div className="row gap-2" style={{ marginBottom: 12 }}>
                  <span style={{ color: 'var(--success)', fontSize: 16 }}>✓</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Proposal submitted</span>
                </div>
                <div className="col gap-2" style={{ fontSize: 13 }}>
                  <div className="row between">
                    <span className="muted">Your bid</span>
                    <span className="num amber-text" style={{ fontWeight: 600 }}>${Number(myBid.amount).toLocaleString()}</span>
                  </div>
                  <div className="row between">
                    <span className="muted">Delivery</span>
                    <span style={{ fontWeight: 500 }}>{myBid.delivery_days} days</span>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
                  The client will review your proposal and get back to you. Check your Proposals tab for updates.
                </p>
              </div>
            ) : (
              <div className="glass" style={{ padding: 22 }}>
                <div className="num amber-text" style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                  ${Math.round(job.budget_min / 1000)}–${Math.round(job.budget_max / 1000)}k
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 18 }}>Budget range</div>
                <button className="btn amber" style={{ width: '100%' }} onClick={() => setBidModal(true)}>
                  Submit proposal <Icon name="arrow-right" size={14} />
                </button>
                <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
                  One focused proposal — no spam.
                </p>
              </div>
            )
          )}

          {/* not authenticated */}
          {!isAuthenticated && (
            <div className="glass" style={{ padding: 22, textAlign: 'center' }}>
              <div className="num amber-text" style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                ${Math.round(job.budget_min / 1000)}–${Math.round(job.budget_max / 1000)}k
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 18 }}>Budget range</div>
              <Link to="/login" className="btn amber" style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                Sign in to bid <Icon name="arrow-right" size={14} />
              </Link>
              <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                No account?{' '}
                <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register free</Link>
              </p>
            </div>
          )}

          {/* client owns this brief */}
          {isOwner && (
            <div className="glass" style={{ padding: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Your brief</div>
              <div className="num amber-text" style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                ${Math.round(job.budget_min / 1000)}–${Math.round(job.budget_max / 1000)}k
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Budget · {bids.length} proposal{bids.length !== 1 ? 's' : ''}</div>
              <button className="btn ghost sm" style={{ width: '100%' }} onClick={openEdit}>
                <Icon name="settings" size={13} /> Edit brief
              </button>
            </div>
          )}

          {/* brief stats */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="label" style={{ marginBottom: 14 }}>Brief details</div>
            <div className="col gap-3">
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="muted">Deadline</span>
                <span className={due?.hot ? 'amber-text' : ''} style={{ fontWeight: 500 }}>
                  {due ? due.text : fmtDate(job.deadline)}
                </span>
              </div>
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="muted">Posted</span>
                <span style={{ fontWeight: 500 }}>{fmtDate(job.created_at)}</span>
              </div>
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="muted">Category</span>
                <span style={{ fontWeight: 500 }}>{job.category || job.category_name}</span>
              </div>
              {job.location && (
                <div className="row between" style={{ fontSize: 13 }}>
                  <span className="muted">Location</span>
                  <span style={{ fontWeight: 500 }}>{job.location}</span>
                </div>
              )}
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="muted">Status</span>
                <span className={`status ${job.status === 'open' ? 'open' : job.status === 'closed' ? 'closed' : 'active'}`}>
                  {job.status}
                </span>
              </div>
            </div>
          </div>

          {/* client card */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="label" style={{ marginBottom: 14 }}>Posted by</div>
            <div className="row gap-3" style={{ marginBottom: 14 }}>
              <Avatar name={job.client_name} size={40} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{job.client_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>Client</div>
              </div>
            </div>
            <Link to={`/profile/${job.client_id}`}
              className="btn ghost sm" style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
              View profile
            </Link>
          </div>
        </div>
      </div>

      {/* submit proposal modal */}
      <Modal open={bidModal} onClose={() => setBidModal(false)} title="Submit a proposal">
        <form onSubmit={handleBidSubmit}>
          <div className="col gap-4">
            <div className="row gap-3">
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>Your rate ($)</div>
                <input className="field" type="number" min="1" required placeholder="e.g. 2500"
                  value={bidForm.amount} onChange={(e) => setBidForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>Delivery (days)</div>
                <input className="field" type="number" min="1" required placeholder="e.g. 14"
                  value={bidForm.delivery_days} onChange={(e) => setBidForm((p) => ({ ...p, delivery_days: e.target.value }))} />
              </div>
            </div>
            <div>
              <div className="label row between" style={{ marginBottom: 8 }}>
                <span>Cover letter</span>
                <span className={`num ${bidForm.cover_letter.length < 50 ? 'muted' : 'amber-text'}`} style={{ fontWeight: 500, fontSize: 12 }}>
                  {bidForm.cover_letter.length}/2000
                </span>
              </div>
              <textarea className="field" rows={6} required minLength={50}
                placeholder="Describe your approach, relevant experience, and why you're the best fit for this brief…"
                style={{ resize: 'none' }}
                value={bidForm.cover_letter}
                onChange={(e) => setBidForm((p) => ({ ...p, cover_letter: e.target.value }))} />
              {bidForm.cover_letter.length < 50 && bidForm.cover_letter.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                  {50 - bidForm.cover_letter.length} more characters needed
                </div>
              )}
            </div>
            <button type="submit" className="btn amber" style={{ width: '100%' }} disabled={bidSubmitting}>
              {bidSubmitting ? 'Submitting…' : 'Submit proposal'} {!bidSubmitting && <Icon name="arrow-right" size={14} />}
            </button>
          </div>
        </form>
      </Modal>

      {/* edit brief modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit brief">
        <form onSubmit={handleEdit}>
          <div className="col gap-4" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Title</div>
              <input className="field" required value={editForm.title || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Description</div>
              <textarea className="field" required rows={5} style={{ resize: 'none' }}
                value={editForm.description || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="row gap-3">
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>Category</div>
                <select className="field" required value={editForm.category_id || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>Location</div>
                <input className="field" placeholder="Remote" value={editForm.location || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
            <div className="row gap-3">
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>Budget min ($)</div>
                <input className="field" type="number" min="1" required value={editForm.budget_min || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, budget_min: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 8 }}>Budget max ($)</div>
                <input className="field" type="number" min="1" required value={editForm.budget_max || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, budget_max: e.target.value }))} />
              </div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Deadline</div>
              <input className="field" type="date" required value={editForm.deadline || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Skills <span className="muted" style={{ fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></div>
              <input className="field" placeholder="React, Node.js, PostgreSQL" value={editForm.skills_required || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, skills_required: e.target.value }))} />
            </div>
          </div>
          <div style={{ paddingTop: 16, marginTop: 4 }}>
            <button type="submit" className="btn amber" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* delete confirmation modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete this brief?">
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
          This will permanently remove the brief and all associated proposals. This action cannot be undone.
        </p>
        <div className="row gap-3">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDeleteModal(false)}>Cancel</button>
          <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}
            disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : 'Delete brief'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default JobDetail;
