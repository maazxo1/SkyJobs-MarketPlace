import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getOrder, startOrder, deliverOrder, approveOrder,
  requestRevision, cancelOrder, openDispute,
} from '../../api/orders.api';
import { reviewOrder } from '../../api/reviews.api';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';
import Modal from '../../components/common/Modal';

const fmtDate = (s) => s
  ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`;
const daysUntil = (d) => {
  if (!d) return null;
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, hot: true };
  if (n === 0) return { text: 'Due today', hot: true };
  return { text: `${n}d left`, hot: n <= 4 };
};

const StarRating = ({ value, onChange }) => (
  <div className="row gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)}
        style={{ color: n <= value ? 'var(--accent)' : 'var(--ink-4)', fontSize: 22 }}>
        ★
      </button>
    ))}
  </div>
);

const DISPUTE_REASONS = [
  { value: 'non_delivery',            label: 'Non-delivery' },
  { value: 'quality_issues',          label: 'Quality issues' },
  { value: 'scope_creep',             label: 'Scope creep' },
  { value: 'payment_withheld',        label: 'Payment withheld' },
  { value: 'communication_breakdown', label: 'Communication breakdown' },
  { value: 'other',                   label: 'Other' },
];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  // Modal states
  const [deliverModal, setDeliverModal] = useState(false);
  const [deliverMsg, setDeliverMsg] = useState('');
  const [revisionModal, setRevisionModal] = useState(false);
  const [revisionMsg, setRevisionMsg] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getOrder(id);
      setOrder(res.data.data);
    } catch {
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, successMsg) => {
    setActing(true);
    try {
      await fn();
      toast.success(successMsg);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (loading) return (
    <div className="content">
      <div className="skel" style={{ height: 140, borderRadius: 'var(--r-lg)', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="skel" style={{ height: 360, borderRadius: 'var(--r-lg)' }} />
        <div className="skel" style={{ height: 360, borderRadius: 'var(--r-lg)' }} />
      </div>
    </div>
  );
  if (!order) return null;

  const isClient     = order.client_id === user?.id;
  const isFreelancer = order.freelancer_id === user?.id;
  const s            = order.status;
  const due          = daysUntil(order.deadline);
  const isActive     = !['completed', 'cancelled'].includes(s);

  const canDispute = isClient
    ? ['in_progress', 'delivered'].includes(s)
    : ['in_progress', 'revision_requested'].includes(s);

  return (
    <div className="content">
      {/* breadcrumb */}
      <div className="row gap-2" style={{ marginBottom: 18 }}>
        <button className="muted" style={{ fontSize: 12 }} onClick={() => navigate('/orders')}>
          ← Orders
        </button>
        <span className="muted" style={{ fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12 }}>Order #{String(order.id).padStart(4, '0')}</span>
      </div>

      {/* header card */}
      <div className="glass" style={{ padding: 28, marginBottom: 16 }}>
        <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="row gap-3" style={{ alignItems: 'center', marginBottom: 12 }}>
              <StatusPill status={s} />
              <span className="eyebrow">#{String(order.id).padStart(4, '0')}</span>
            </div>
            <h1 className="display-3" style={{ marginBottom: 10 }}>{order.job_title}</h1>
            <div className="row gap-4 muted" style={{ fontSize: 12, flexWrap: 'wrap' }}>
              <span className="row gap-1" style={{ alignItems: 'center' }}>
                <Icon name="calendar" size={12} /> Due {fmtDate(order.deadline)}
              </span>
              {due && (
                <span className={due.hot ? 'coral-text' : ''} style={{ fontWeight: 600 }}>
                  {due.text}
                </span>
              )}
              {order.max_revisions != null && (
                <span>Up to {order.max_revisions} revision{order.max_revisions !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <div className="right">
            <div className="num" style={{ fontSize: 32, color: 'var(--accent)' }}>{fmtMoney(order.amount)}</div>
            <div className="muted" style={{ fontSize: 11 }}>
              Freelancer payout: {fmtMoney(order.freelancer_payout)}
            </div>
          </div>
        </div>

        {/* parties */}
        <div className="row gap-5" style={{ paddingTop: 18, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { role: 'Client',     name: order.client_name,     id: order.client_id },
            { role: 'Freelancer', name: order.freelancer_name, id: order.freelancer_id },
          ].map(({ role, name, id: uid }) => (
            <div key={role} className="row gap-2" style={{ alignItems: 'center' }}>
              <Avatar name={name} size={32} />
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-4)' }}>{role}</div>
                <button onClick={() => navigate(`/profile/${uid}`)}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  {name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* body: actions + deliveries | timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        <div className="col gap-4">

          {/* ── Action panel ── */}
          {(isActive || s === 'completed') && (
            <div className="glass" style={{ padding: 22 }}>
              <h3 className="h-section" style={{ marginBottom: 16 }}>
                {s === 'completed' ? 'Review' : 'Actions'}
              </h3>

              {/* Freelancer: start */}
              {isFreelancer && s === 'awaiting_start' && (
                <div className="col gap-3">
                  <p className="muted" style={{ fontSize: 13 }}>
                    Ready to begin? Click below to mark this order as started and notify the client.
                  </p>
                  <button className="btn amber" style={{ alignSelf: 'flex-start' }} disabled={acting}
                    onClick={() => act(() => startOrder(order.id), 'Work started — client notified.')}>
                    <Icon name="play" size={14} /> Start work
                  </button>
                </div>
              )}

              {/* Freelancer: deliver */}
              {isFreelancer && (s === 'in_progress' || s === 'revision_requested') && (
                <div className="col gap-3">
                  {s === 'revision_requested' && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'color-mix(in oklch, var(--warning) 10%, transparent)', border: '1px solid color-mix(in oklch, var(--warning) 25%, transparent)', fontSize: 12 }}>
                      <strong>Revision requested</strong> — the client asked for changes. Submit a new delivery when ready.
                    </div>
                  )}
                  <button className="btn amber" style={{ alignSelf: 'flex-start' }}
                    onClick={() => { setDeliverMsg(''); setDeliverModal(true); }}>
                    <Icon name="upload" size={14} /> Submit delivery
                  </button>
                </div>
              )}

              {/* Freelancer: client is awaiting start, nothing to do */}
              {isClient && s === 'awaiting_start' && (
                <p className="muted" style={{ fontSize: 13 }}>
                  Waiting for the freelancer to start work. You'll be notified once they begin.
                </p>
              )}

              {/* Client: delivery pending approval */}
              {isClient && s === 'delivered' && (
                <div className="col gap-3">
                  <p className="muted" style={{ fontSize: 13 }}>
                    The freelancer has submitted a delivery. Review it below and approve or request changes.
                  </p>
                  <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                    <button className="btn success" disabled={acting}
                      onClick={() => act(() => approveOrder(order.id), 'Delivery approved! Order complete.')}>
                      <Icon name="check" size={14} /> Approve delivery
                    </button>
                    <button className="btn ghost"
                      onClick={() => { setRevisionMsg(''); setRevisionModal(true); }}>
                      Request revision
                    </button>
                  </div>
                </div>
              )}

              {/* Client: in progress — can cancel */}
              {isClient && s === 'in_progress' && (
                <div className="col gap-2">
                  <p className="muted" style={{ fontSize: 13 }}>Freelancer is working on your order.</p>
                  <button className="btn ghost sm" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }}
                    onClick={() => { setCancelReason(''); setCancelModal(true); }}>
                    Request cancellation
                  </button>
                </div>
              )}

              {/* Dispute */}
              {isActive && canDispute && !order.dispute_id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button className="btn ghost sm" style={{ color: 'var(--danger)' }}
                    onClick={() => { setDisputeReason(''); setDisputeDesc(''); setDisputeModal(true); }}>
                    <Icon name="alert" size={13} /> Open a dispute
                  </button>
                </div>
              )}
              {order.dispute_id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button className="btn ghost sm"
                    onClick={() => navigate(`/disputes/${order.dispute_id}`)}>
                    View open dispute →
                  </button>
                </div>
              )}

              {/* Review section */}
              {s === 'completed' && !reviewed && (
                <div className="col gap-3">
                  <p className="muted" style={{ fontSize: 13 }}>
                    Share your experience. Reviews reveal once both parties submit, or after 14 days.
                  </p>
                  <button className="btn amber" style={{ alignSelf: 'flex-start' }}
                    onClick={() => { setReviewRating(5); setReviewComment(''); setReviewModal(true); }}>
                    <Icon name="star" size={14} /> Leave a review
                  </button>
                </div>
              )}
              {s === 'completed' && reviewed && (
                <div className="row gap-2 muted" style={{ fontSize: 13 }}>
                  <Icon name="check" size={14} /> Review submitted — visible once both parties review.
                </div>
              )}
            </div>
          )}

          {/* ── Deliveries ── */}
          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
              <h3 className="h-section">
                Deliveries {order.deliveries?.length > 0 && `(${order.deliveries.length})`}
              </h3>
            </div>

            {(!order.deliveries || order.deliveries.length === 0) ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="muted">
                {isFreelancer
                  ? 'No deliveries yet. Submit your first delivery above.'
                  : 'Awaiting the freelancer\'s first delivery.'}
              </div>
            ) : (
              order.deliveries.map((d, i) => (
                <div key={d.id} style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                  <div className="row between" style={{ marginBottom: 8, alignItems: 'center' }}>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                      <Icon name="upload" size={14} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        Delivery #{order.deliveries.length - i}
                        {d.is_revision && <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}> (revision)</span>}
                      </span>
                    </div>
                    <span className="muted" style={{ fontSize: 11 }}>{fmtDate(d.created_at)}</span>
                  </div>
                  {d.message && (
                    <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-2)', marginBottom: 10 }}>
                      {d.message}
                    </p>
                  )}
                  {d.attachments?.length > 0 && (
                    <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                      {d.attachments.map((a) => (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                          className="btn ghost sm" style={{ fontSize: 11 }}>
                          <Icon name="link" size={11} /> {a.filename || 'Attachment'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Timeline sidebar ── */}
        <div className="glass" style={{ padding: 22 }}>
          <h3 className="h-section" style={{ marginBottom: 18 }}>Timeline</h3>

          {order.history?.length > 0 ? (
            <div>
              {order.history.map((h, i) => {
                const isLast = i === order.history.length - 1;
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        background: isLast ? 'var(--accent)' : 'var(--border-strong)',
                        boxShadow: isLast ? '0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)' : 'none',
                      }} />
                      {!isLast && (
                        <div style={{ width: 1, flex: 1, minHeight: 22, background: 'var(--border)' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 20, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {(h.to_status || 'created').replace(/_/g, ' ')}
                      </div>
                      {h.note && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.5 }}>
                          {h.note}
                        </div>
                      )}
                      <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                        {fmtDate(h.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No history yet.</p>
          )}

          {/* meta */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Created',         value: fmtDate(order.created_at) },
              { label: 'Max revisions',   value: order.max_revisions ?? 'Unlimited' },
              { label: 'Platform fee',    value: fmtMoney(order.platform_fee) },
              { label: 'Freelancer gets', value: fmtMoney(order.freelancer_payout) },
            ].map(({ label, value }) => (
              <div key={label} className="row between" style={{ fontSize: 11, marginBottom: 8 }}>
                <span className="muted">{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Deliver */}
      <Modal open={deliverModal} onClose={() => setDeliverModal(false)} title="Submit delivery" width={500}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Describe what you've completed. The client will have 3 days to review before auto-approval.
        </p>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Message</div>
            <textarea className="field" rows={5} value={deliverMsg}
              onChange={(e) => setDeliverMsg(e.target.value)}
              placeholder="Describe what you built, how to test it, any credentials or notes…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDeliverModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting || !deliverMsg.trim()}
            onClick={async () => {
              await act(() => deliverOrder(order.id, { message: deliverMsg }), 'Delivery submitted!');
              setDeliverModal(false);
              setDeliverMsg('');
            }}>
            {acting ? 'Submitting…' : 'Submit delivery'}
          </button>
        </div>
      </Modal>

      {/* Request revision */}
      <Modal open={revisionModal} onClose={() => setRevisionModal(false)} title="Request revision" width={460}>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>What needs to change?</div>
            <textarea className="field" rows={4} value={revisionMsg}
              onChange={(e) => setRevisionMsg(e.target.value)}
              placeholder="Be specific about what you'd like changed or improved…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setRevisionModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting || !revisionMsg.trim()}
            onClick={async () => {
              await act(() => requestRevision(order.id, { feedback: revisionMsg }), 'Revision requested.');
              setRevisionModal(false);
              setRevisionMsg('');
            }}>
            {acting ? 'Requesting…' : 'Request revision'}
          </button>
        </div>
      </Modal>

      {/* Request cancellation */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Request cancellation" width={460}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          The other party must agree to cancel. If they decline, you can open a dispute instead.
          Funds will be refunded to you if the cancellation is accepted.
        </p>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Reason</div>
            <textarea className="field" rows={3} value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why do you want to cancel?" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setCancelModal(false)}>Never mind</button>
          <button className="btn danger" style={{ flex: 1 }} disabled={acting || !cancelReason.trim()}
            onClick={async () => {
              await act(() => cancelOrder(order.id, { reason: cancelReason }), 'Cancellation request sent.');
              setCancelModal(false);
              setCancelReason('');
            }}>
            {acting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </Modal>

      {/* Open dispute */}
      <Modal open={disputeModal} onClose={() => setDisputeModal(false)} title="Open a dispute" width={500}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Disputes are reviewed by our team within 3–5 business days. Please provide as much detail as possible.
        </p>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Reason</div>
            <select className="field" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
              <option value="">Select a reason…</option>
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Description</div>
            <textarea className="field" rows={5} value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              placeholder="Explain what happened and what resolution you're seeking…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDisputeModal(false)}>Cancel</button>
          <button className="btn danger" style={{ flex: 1 }} disabled={acting || !disputeReason || !disputeDesc.trim()}
            onClick={async () => {
              await act(() => openDispute(order.id, { reason: disputeReason, description: disputeDesc }), 'Dispute opened.');
              setDisputeModal(false);
            }}>
            {acting ? 'Opening…' : 'Open dispute'}
          </button>
        </div>
      </Modal>

      {/* Review */}
      <Modal open={reviewModal} onClose={() => setReviewModal(false)} title="Leave a review" width={460}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Reviews are kept private until both parties submit, then revealed simultaneously.
          You have 14 days from order completion.
        </p>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Rating</div>
            <StarRating value={reviewRating} onChange={setReviewRating} />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Comment (optional)</div>
            <textarea className="field" rows={4} value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setReviewModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting}
            onClick={async () => {
              setActing(true);
              try {
                await reviewOrder(order.id, { rating: reviewRating, comment: reviewComment });
                toast.success('Review submitted!');
                setReviewed(true);
                setReviewModal(false);
              } catch (err) {
                if (err.response?.status === 409) {
                  toast.info('You\'ve already reviewed this order.');
                  setReviewed(true);
                  setReviewModal(false);
                } else {
                  toast.error(err.response?.data?.error || 'Failed to submit review');
                }
              } finally {
                setActing(false);
              }
            }}>
            {acting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetail;
