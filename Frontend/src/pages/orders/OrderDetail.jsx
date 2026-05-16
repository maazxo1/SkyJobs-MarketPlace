import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getOrder, startOrder, deliverOrder, approveOrder,
  requestRevision, cancelOrder, cancelRespond, openDispute,
  requestExtension, respondExtension, sendOrderMessage,
} from '../../api/orders.api';
import { reviewOrder } from '../../api/reviews.api';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';
import Modal from '../../components/common/Modal';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s) => s
  ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';
const fmtTime = (s) => s
  ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  : '—';
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString()}`;

const daysUntil = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, hot: true, overdue: true };
  if (diff === 0) return { text: 'Due today', hot: true, overdue: false };
  return { text: `${diff}d left`, hot: diff <= 3, overdue: false };
};

const autoCompleteCountdown = (at) => {
  if (!at) return null;
  const diff = new Date(at) - Date.now();
  if (diff <= 0) return 'Auto-approving soon';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `Auto-approves in ${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `Auto-approves in ${hours}h ${mins}m`;
  return `Auto-approves in ${mins}m`;
};

const STATUS_LABEL = {
  awaiting_start:      'Waiting to start',
  in_progress:         'In progress',
  delivered:           'Awaiting review',
  revision_requested:  'Revision requested',
  in_dispute:          'In dispute',
  completed:           'Completed',
  cancelled:           'Cancelled',
};

const STATUS_GUIDE = {
  awaiting_start:     { freelancer: 'Click "Start work" when you\'re ready to begin.', client: 'Waiting for the freelancer to start work.' },
  in_progress:        { freelancer: 'Work is in progress. Submit a delivery when done.', client: 'The freelancer is working on your order.' },
  delivered:          { freelancer: 'You\'ve submitted a delivery. Waiting for client review.', client: 'Review the delivery below and approve or request changes.' },
  revision_requested: { freelancer: 'The client has requested changes. See their feedback below.', client: 'Waiting for the freelancer to submit a revised delivery.' },
  in_dispute:         { freelancer: 'This order is under dispute review.', client: 'This order is under dispute review.' },
  completed:          { freelancer: 'Order complete. Payment is on its way.', client: 'Order complete. You may leave a review below.' },
  cancelled:          { freelancer: 'This order has been cancelled.', client: 'This order has been cancelled.' },
};

const DISPUTE_REASONS = [
  { value: 'non_delivery',            label: 'Non-delivery — freelancer has not delivered' },
  { value: 'quality_issues',          label: 'Quality issues — work doesn\'t meet standards' },
  { value: 'scope_creep',             label: 'Scope creep — more work added than agreed' },
  { value: 'payment_withheld',        label: 'Payment withheld — client not approving' },
  { value: 'communication_breakdown', label: 'Communication breakdown' },
  { value: 'other',                   label: 'Other' },
];

const StarRating = ({ value, onChange }) => (
  <div className="row gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)}
        style={{ color: n <= value ? '#f59e0b' : 'var(--ink-4)', fontSize: 24, lineHeight: 1 }}>
        ★
      </button>
    ))}
  </div>
);

// ── Sub-components ────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--ink)' }}>{value}</span>
  </div>
);

const DeliveryCard = ({ delivery, index, total, isLatest }) => (
  <div style={{
    borderRadius: 'var(--r-lg)',
    border: `1px solid ${isLatest ? 'color-mix(in oklch, var(--accent) 40%, transparent)' : 'var(--border)'}`,
    background: isLatest ? 'color-mix(in oklch, var(--accent) 4%, transparent)' : 'transparent',
    padding: '18px 20px',
    marginBottom: 12,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: isLatest ? 'var(--accent)' : 'var(--border-strong)',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon name="upload" size={13} style={{ color: isLatest ? 'white' : 'var(--ink-3)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            Delivery #{total - index}
            {delivery.is_revision && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-4)', fontWeight: 400 }}>revision</span>}
            {isLatest && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>latest</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{fmtTime(delivery.created_at)}</div>
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
        background: delivery.status === 'approved'
          ? 'color-mix(in oklch, var(--success) 15%, transparent)'
          : delivery.status === 'rejected'
            ? 'color-mix(in oklch, var(--danger) 12%, transparent)'
            : 'color-mix(in oklch, var(--warning) 12%, transparent)',
        color: delivery.status === 'approved' ? 'var(--success)' : delivery.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
        textTransform: 'capitalize',
      }}>
        {delivery.status}
      </span>
    </div>

    {delivery.message && (
      <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: delivery.attachments?.length ? 12 : 0, whiteSpace: 'pre-wrap' }}>
        {delivery.message}
      </p>
    )}

    {delivery.attachments?.length > 0 && (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {delivery.attachments.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: '1px solid var(--border)', color: 'var(--accent)',
              background: 'color-mix(in oklch, var(--accent) 6%, transparent)',
            }}>
            <Icon name="link" size={11} />
            {a.filename || 'Attachment'}
          </a>
        ))}
      </div>
    )}

    {delivery.rejection_feedback && (
      <div style={{
        marginTop: 12, padding: '10px 14px', borderRadius: 8,
        background: 'color-mix(in oklch, var(--danger) 8%, transparent)',
        border: '1px solid color-mix(in oklch, var(--danger) 20%, transparent)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Client feedback
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>{delivery.rejection_feedback}</p>
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const msgEndRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | messages

  // Modals
  const [deliverModal, setDeliverModal]   = useState(false);
  const [deliverMsg, setDeliverMsg]       = useState('');
  const [deliverLinks, setDeliverLinks]   = useState(['']);
  const [revisionModal, setRevisionModal] = useState(false);
  const [revisionMsg, setRevisionMsg]     = useState('');
  const [cancelModal, setCancelModal]     = useState(false);
  const [cancelReason, setCancelReason]   = useState('');
  const [extModal, setExtModal]           = useState(false);
  const [extDate, setExtDate]             = useState('');
  const [extReason, setExtReason]         = useState('');
  const [disputeModal, setDisputeModal]   = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc]     = useState('');
  const [reviewModal, setReviewModal]     = useState(false);
  const [reviewRating, setReviewRating]   = useState(5);
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

  useEffect(() => {
    if (activeTab === 'messages') {
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeTab, order?.messages]);

  const act = async (fn, successMsg, closeModal) => {
    setActing(true);
    try {
      await fn();
      toast.success(successMsg);
      if (closeModal) closeModal();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await sendOrderMessage(id, { message: msgText });
      setMsgText('');
      await load();
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="content">
      <div className="skel" style={{ height: 28, width: 200, borderRadius: 8, marginBottom: 20 }} />
      <div className="skel" style={{ height: 160, borderRadius: 'var(--r-lg)', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div className="col gap-3">
          <div className="skel" style={{ height: 80, borderRadius: 'var(--r-lg)' }} />
          <div className="skel" style={{ height: 200, borderRadius: 'var(--r-lg)' }} />
        </div>
        <div className="skel" style={{ height: 400, borderRadius: 'var(--r-lg)' }} />
      </div>
    </div>
  );
  if (!order) return null;

  const isClient     = order.client_id === user?.id;
  const isFreelancer = order.freelancer_id === user?.id;
  const s            = order.status;
  const due          = daysUntil(order.deadline);
  const isActive     = !['completed', 'cancelled'].includes(s);
  const canDispute   = isClient
    ? ['in_progress', 'delivered'].includes(s)
    : ['in_progress', 'revision_requested'].includes(s);
  const hasPendingCancel = !!order.pending_cancellation;
  const hasPendingExt    = !!order.pending_extension;
  const revisionFeedback = order.deliveries?.find((d) => d.is_revision === false && d.status === 'rejected')?.rejection_feedback
    || order.deliveries?.find((d) => d.rejection_feedback)?.rejection_feedback;
  const autoComplete = autoCompleteCountdown(order.auto_complete_at);
  const revisionsUsed = order.revision_count ?? 0;
  const revisionsMax  = order.max_revisions ?? 2;
  const latestDelivery = order.deliveries?.[0];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="content">
      {/* breadcrumb */}
      <div className="row gap-2" style={{ marginBottom: 20 }}>
        <button onClick={() => navigate('/orders')} style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="chevron-left" size={12} /> Orders
        </button>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>/</span>
        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Order #{String(order.id).padStart(4, '0')}</span>
      </div>

      {/* ── Header ── */}
      <div className="glass" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <StatusPill status={s} />
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                #{String(order.id).padStart(4, '0')}
              </span>
              {order.is_late && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', padding: '2px 8px', borderRadius: 6, background: 'color-mix(in oklch, var(--danger) 12%, transparent)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)' }}>
                  Late
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{order.job_title}</h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-3)' }}>
                <Icon name="calendar" size={12} />
                Due {fmtDate(order.deadline)}
              </span>
              {due && (
                <span style={{ fontSize: 12, fontWeight: 600, color: due.overdue ? 'var(--danger)' : due.hot ? 'var(--warning)' : 'var(--ink-3)' }}>
                  {due.text}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                {revisionsUsed}/{revisionsMax} revisions used
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>
              {fmtMoney(order.amount)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
              Freelancer earns {fmtMoney(order.freelancer_payout)}
            </div>
          </div>
        </div>

        {/* parties */}
        <div style={{ display: 'flex', gap: 24, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { role: 'Client', name: order.client_name, uid: order.client_id },
            { role: 'Freelancer', name: order.freelancer_name, uid: order.freelancer_id },
          ].map(({ role, name, uid }) => (
            <button key={role} onClick={() => navigate(`/profile/${uid}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
              <Avatar name={name} size={34} square />
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 1 }}>{role}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Context banners ── */}

      {/* Auto-complete countdown */}
      {s === 'delivered' && autoComplete && (
        <div style={{ padding: '12px 18px', borderRadius: 'var(--r-md)', background: 'color-mix(in oklch, var(--accent) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <Icon name="clock" size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--accent)' }}>{autoComplete}</strong> — if not reviewed, the order will be approved automatically.
          </span>
        </div>
      )}

      {/* Revision feedback banner */}
      {s === 'revision_requested' && revisionFeedback && isFreelancer && (
        <div style={{ padding: '14px 18px', borderRadius: 'var(--r-md)', background: 'color-mix(in oklch, var(--warning) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--warning) 30%, transparent)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="alert" size={13} /> Client feedback — revision #{revisionsUsed} of {revisionsMax}
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, margin: 0 }}>{revisionFeedback}</p>
        </div>
      )}

      {/* Pending cancellation request */}
      {hasPendingCancel && (
        <div style={{ padding: '14px 18px', borderRadius: 'var(--r-md)', background: 'color-mix(in oklch, var(--danger) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--danger) 25%, transparent)', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="x" size={13} /> Cancellation requested by {order.pending_cancellation.requester_name}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 12 }}>
            {order.pending_cancellation.reason}
          </p>
          {order.pending_cancellation.requested_by !== user?.id && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn danger sm" disabled={acting}
                onClick={() => act(() => cancelRespond(order.id, { accept: true }), 'Order cancelled.')}>
                Accept cancellation
              </button>
              <button className="btn ghost sm" disabled={acting}
                onClick={() => act(() => cancelRespond(order.id, { accept: false }), 'Cancellation declined.')}>
                Decline
              </button>
            </div>
          )}
          {order.pending_cancellation.requested_by === user?.id && (
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Waiting for the other party to respond…</span>
          )}
        </div>
      )}

      {/* Pending extension request */}
      {hasPendingExt && (
        <div style={{ padding: '14px 18px', borderRadius: 'var(--r-md)', background: 'color-mix(in oklch, var(--accent) 6%, transparent)', border: '1px solid color-mix(in oklch, var(--accent) 20%, transparent)', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="calendar" size={13} /> Deadline extension requested
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 6 }}>
            New deadline: <strong>{fmtDate(order.pending_extension.requested_deadline)}</strong>
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 12 }}>
            {order.pending_extension.reason}
          </p>
          {isClient && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn amber sm" disabled={acting}
                onClick={() => act(() => respondExtension(order.id, order.pending_extension.id, { accept: true }), 'Extension approved.')}>
                Approve extension
              </button>
              <button className="btn ghost sm" disabled={acting}
                onClick={() => act(() => respondExtension(order.id, order.pending_extension.id, { accept: false }), 'Extension declined.')}>
                Decline
              </button>
            </div>
          )}
          {isFreelancer && (
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Waiting for client to respond…</span>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Left: main content ── */}
        <div className="col gap-3">

          {/* Status guide */}
          <div style={{ padding: '14px 18px', borderRadius: 'var(--r-md)', background: 'color-mix(in oklch, var(--ink) 3%, transparent)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'color-mix(in oklch, var(--accent) 12%, transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name={s === 'completed' ? 'check' : s === 'cancelled' ? 'x' : 'clock'} size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                {STATUS_LABEL[s] || s.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                {STATUS_GUIDE[s]?.[isFreelancer ? 'freelancer' : 'client'] || ''}
              </div>
            </div>
          </div>

          {/* Action buttons — always visible, contextual */}
          {isActive && (
            <div className="glass" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 14 }}>
                Actions
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

                {/* Freelancer: start work */}
                {isFreelancer && s === 'awaiting_start' && (
                  <button className="btn amber" disabled={acting}
                    onClick={() => act(() => startOrder(order.id), 'Work started — client notified.')}>
                    <Icon name="play" size={13} /> Start work
                  </button>
                )}

                {/* Freelancer: submit delivery */}
                {isFreelancer && (s === 'in_progress' || s === 'revision_requested') && (
                  <button className="btn amber"
                    onClick={() => { setDeliverMsg(''); setDeliverLinks(['']); setDeliverModal(true); }}>
                    <Icon name="upload" size={13} /> Submit delivery
                    {s === 'revision_requested' && <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>(revision)</span>}
                  </button>
                )}

                {/* Freelancer: request extension */}
                {isFreelancer && ['in_progress', 'revision_requested'].includes(s) && !hasPendingExt && order.extension_count < 3 && (
                  <button className="btn ghost sm"
                    onClick={() => { setExtDate(''); setExtReason(''); setExtModal(true); }}>
                    <Icon name="calendar" size={13} /> Request extension
                  </button>
                )}

                {/* Client: approve delivery */}
                {isClient && s === 'delivered' && (
                  <button className="btn success" disabled={acting}
                    onClick={() => act(() => approveOrder(order.id), 'Delivery approved! Order complete.')}>
                    <Icon name="check" size={13} /> Approve delivery
                  </button>
                )}

                {/* Client: request revision */}
                {isClient && s === 'delivered' && revisionsUsed < revisionsMax && (
                  <button className="btn ghost"
                    onClick={() => { setRevisionMsg(''); setRevisionModal(true); }}>
                    Request revision <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 4 }}>({revisionsMax - revisionsUsed} left)</span>
                  </button>
                )}

                {/* Client: request cancellation */}
                {isClient && ['in_progress', 'revision_requested', 'delivered', 'awaiting_start'].includes(s) && !hasPendingCancel && (
                  <button className="btn ghost sm" style={{ color: 'var(--danger)' }}
                    onClick={() => { setCancelReason(''); setCancelModal(true); }}>
                    <Icon name="x" size={13} /> Cancel order
                  </button>
                )}

                {/* Open dispute */}
                {canDispute && !order.dispute_id && (
                  <button className="btn ghost sm" style={{ color: 'var(--danger)' }}
                    onClick={() => { setDisputeReason(''); setDisputeDesc(''); setDisputeModal(true); }}>
                    <Icon name="alert" size={13} /> Open dispute
                  </button>
                )}

                {/* View dispute */}
                {order.dispute_id && (
                  <button className="btn ghost sm"
                    onClick={() => navigate(`/disputes/${order.dispute_id}`)}>
                    View dispute →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completed: review */}
          {s === 'completed' && !reviewed && (
            <div className="glass" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Leave a review</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Reviews reveal once both parties submit or after 14 days.</div>
                </div>
                <button className="btn amber sm"
                  onClick={() => { setReviewRating(5); setReviewComment(''); setReviewModal(true); }}>
                  <Icon name="star" size={13} /> Review
                </button>
              </div>
            </div>
          )}
          {s === 'completed' && reviewed && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'color-mix(in oklch, var(--success) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--success) 20%, transparent)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--success)' }}>
              <Icon name="check" size={14} /> Review submitted — visible once both parties review.
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
            {[
              { key: 'overview', label: `Deliveries (${order.deliveries?.length || 0})` },
              { key: 'messages', label: `Messages (${order.messages?.length || 0})` },
            ].map((tab) => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 600,
                  color: activeTab === tab.key ? 'var(--accent)' : 'var(--ink-3)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -2,
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Deliveries tab */}
          {activeTab === 'overview' && (
            <div>
              {!order.deliveries || order.deliveries.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 'var(--r-lg)', border: '1px dashed var(--border)' }}>
                  <div style={{ color: 'var(--ink-4)', fontSize: 13 }}>
                    {isFreelancer ? 'No deliveries yet. Submit your first delivery above.' : 'Waiting for the freelancer to submit a delivery.'}
                  </div>
                </div>
              ) : (
                order.deliveries.map((d, i) => (
                  <DeliveryCard key={d.id} delivery={d} index={i} total={order.deliveries.length} isLatest={i === 0} />
                ))
              )}
            </div>
          )}

          {/* Messages tab */}
          {activeTab === 'messages' && (
            <div>
              <div style={{
                minHeight: 280, maxHeight: 420, overflowY: 'auto',
                padding: '16px 4px', display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {order.messages?.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-4)', fontSize: 13 }}>
                    No messages yet. Start the conversation.
                  </div>
                )}
                {order.messages?.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                      <Avatar name={m.sender_name} size={28} square />
                      <div style={{ maxWidth: '72%' }}>
                        <div style={{
                          padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isMe ? 'var(--accent)' : 'color-mix(in oklch, var(--ink) 6%, transparent)',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          fontSize: 13, lineHeight: 1.6,
                          color: isMe ? 'white' : 'var(--ink)',
                        }}>
                          {m.message}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                          {m.sender_name} · {fmtTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>

              {isActive && (
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <input
                    className="field"
                    style={{ flex: 1 }}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Message the other party…"
                    maxLength={2000}
                  />
                  <button type="submit" className="btn amber" disabled={sendingMsg || !msgText.trim()} style={{ flexShrink: 0 }}>
                    <Icon name="send" size={14} />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="col gap-3">

          {/* Order details */}
          <div className="glass" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 12 }}>
              Order details
            </div>
            <InfoRow label="Order value"    value={fmtMoney(order.amount)} accent />
            <InfoRow label="Platform fee"   value={fmtMoney(order.platform_fee)} />
            <InfoRow label="Freelancer gets" value={fmtMoney(order.freelancer_payout)} />
            <InfoRow label="Deadline"       value={fmtDate(order.deadline)} />
            <InfoRow label="Revisions"      value={`${revisionsUsed} / ${revisionsMax}`} />
            {order.extension_count > 0 && (
              <InfoRow label="Extensions used" value={`${order.extension_count} / 3`} />
            )}
            <InfoRow label="Started"        value={order.started_at ? fmtDate(order.started_at) : 'Not yet'} />
            {order.completed_at && <InfoRow label="Completed"  value={fmtDate(order.completed_at)} />}
            {order.cancelled_at && <InfoRow label="Cancelled"  value={fmtDate(order.cancelled_at)} />}
          </div>

          {/* Timeline */}
          <div className="glass" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 16 }}>
              Activity
            </div>
            {order.history?.length > 0 ? (
              [...order.history].reverse().map((h, i) => (
                <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: i < order.history.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      background: i === 0 ? 'var(--accent)' : 'var(--border-strong)',
                      boxShadow: i === 0 ? '0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)' : 'none',
                    }} />
                    {i < order.history.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 16, background: 'var(--border)', marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink-2)' }}>
                      {(h.to_status || 'created').replace(/_/g, ' ')}
                    </div>
                    {h.note && (
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.5 }}>{h.note}</div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{fmtDate(h.created_at)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>No history yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Submit delivery */}
      <Modal open={deliverModal} onClose={() => setDeliverModal(false)} title="Submit delivery" width={520}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18, lineHeight: 1.6 }}>
          Describe what you've completed. The client has <strong>3 days</strong> to review before the order auto-approves.
          {s === 'revision_requested' && <><br /><span style={{ color: 'var(--warning)' }}>This is revision {revisionsUsed + 1} of {revisionsMax}.</span></>}
        </p>
        <div className="col gap-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Delivery notes <span style={{ color: 'var(--danger)' }}>*</span></div>
            <textarea className="field" rows={5} value={deliverMsg}
              onChange={(e) => setDeliverMsg(e.target.value)}
              placeholder="Describe what you built, how to use it, any credentials or notes for the client…" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Attachment links <span style={{ color: 'var(--ink-4)', fontWeight: 400, fontSize: 11 }}>(optional — paste URLs)</span></div>
            {deliverLinks.map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="field" style={{ flex: 1 }} value={link}
                  onChange={(e) => {
                    const next = [...deliverLinks];
                    next[i] = e.target.value;
                    setDeliverLinks(next);
                  }}
                  placeholder="https://drive.google.com/…" />
                {deliverLinks.length > 1 && (
                  <button type="button" style={{ color: 'var(--danger)', padding: '0 8px' }}
                    onClick={() => setDeliverLinks(deliverLinks.filter((_, j) => j !== i))}>
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            ))}
            {deliverLinks.length < 5 && (
              <button type="button" style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}
                onClick={() => setDeliverLinks([...deliverLinks, ''])}>
                + Add another link
              </button>
            )}
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDeliverModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting || !deliverMsg.trim()}
            onClick={() => {
              const attachments = deliverLinks
                .filter((l) => l.trim())
                .map((url) => ({ filename: url.split('/').pop()?.split('?')[0] || 'Attachment', url }));
              act(
                () => deliverOrder(order.id, { message: deliverMsg, attachments }),
                'Delivery submitted! Client has 3 days to review.',
                () => setDeliverModal(false),
              );
            }}>
            {acting ? 'Submitting…' : 'Submit delivery'}
          </button>
        </div>
      </Modal>

      {/* Request revision */}
      <Modal open={revisionModal} onClose={() => setRevisionModal(false)} title="Request revision" width={480}>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'color-mix(in oklch, var(--warning) 10%, transparent)', border: '1px solid color-mix(in oklch, var(--warning) 25%, transparent)', fontSize: 12, color: 'var(--ink-2)', marginBottom: 18 }}>
          This will use <strong>1 of your {revisionsMax - revisionsUsed} remaining revision{revisionsMax - revisionsUsed !== 1 ? 's' : ''}</strong>. Be specific so the freelancer knows exactly what to change.
        </div>
        <div className="col gap-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>What needs to change? <span style={{ color: 'var(--danger)' }}>*</span></div>
            <textarea className="field" rows={5} value={revisionMsg}
              onChange={(e) => setRevisionMsg(e.target.value)}
              placeholder="Be specific: list every change you need. The freelancer will only see this feedback." />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setRevisionModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting || !revisionMsg.trim()}
            onClick={() => act(() => requestRevision(order.id, { feedback: revisionMsg }), 'Revision requested.', () => setRevisionModal(false))}>
            {acting ? 'Sending…' : 'Request revision'}
          </button>
        </div>
      </Modal>

      {/* Request cancellation */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Request cancellation" width={480}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 18 }}>
          The other party must <strong>agree</strong> to cancel. If they decline, you can open a dispute instead.
          Funds will be returned to the client if accepted.
        </p>
        <div className="col gap-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Reason for cancellation <span style={{ color: 'var(--danger)' }}>*</span></div>
            <textarea className="field" rows={3} value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explain why you want to cancel…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setCancelModal(false)}>Never mind</button>
          <button className="btn danger" style={{ flex: 1 }} disabled={acting || !cancelReason.trim()}
            onClick={() => act(() => cancelOrder(order.id, { reason: cancelReason }), 'Cancellation request sent.', () => setCancelModal(false))}>
            {acting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </Modal>

      {/* Request extension */}
      <Modal open={extModal} onClose={() => setExtModal(false)} title="Request deadline extension" width={480}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 18 }}>
          Current deadline: <strong>{fmtDate(order.deadline)}</strong>. You have {3 - (order.extension_count || 0)} extension{3 - (order.extension_count || 0) !== 1 ? 's' : ''} remaining.
        </p>
        <div className="col gap-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>New deadline <span style={{ color: 'var(--danger)' }}>*</span></div>
            <input type="date" className="field" value={extDate}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              onChange={(e) => setExtDate(e.target.value)} />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Reason <span style={{ color: 'var(--danger)' }}>*</span></div>
            <textarea className="field" rows={3} value={extReason}
              onChange={(e) => setExtReason(e.target.value)}
              placeholder="Why do you need more time?" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setExtModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting || !extDate || !extReason.trim()}
            onClick={() => act(() => requestExtension(order.id, { new_deadline: extDate, reason: extReason }), 'Extension request sent.', () => setExtModal(false))}>
            {acting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </Modal>

      {/* Open dispute */}
      <Modal open={disputeModal} onClose={() => setDisputeModal(false)} title="Open a dispute" width={520}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 18 }}>
          Disputes are reviewed by our team within 3–5 business days. The other party has <strong>72 hours</strong> to respond before it escalates automatically.
        </p>
        <div className="col gap-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Reason <span style={{ color: 'var(--danger)' }}>*</span></div>
            <select className="field" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
              <option value="">Select a reason…</option>
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Description <span style={{ color: 'var(--danger)' }}>*</span></div>
            <textarea className="field" rows={5} value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              placeholder="Explain exactly what happened, what was agreed, and what resolution you're seeking…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDisputeModal(false)}>Cancel</button>
          <button className="btn danger" style={{ flex: 1 }} disabled={acting || !disputeReason || !disputeDesc.trim()}
            onClick={() => act(() => openDispute(order.id, { reason: disputeReason, description: disputeDesc }), 'Dispute opened.', () => setDisputeModal(false))}>
            {acting ? 'Opening…' : 'Open dispute'}
          </button>
        </div>
      </Modal>

      {/* Leave review */}
      <Modal open={reviewModal} onClose={() => setReviewModal(false)} title="Leave a review" width={480}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 18 }}>
          Reviews are kept private until both parties submit, then revealed simultaneously. You have 14 days from order completion.
        </p>
        <div className="col gap-4" style={{ marginBottom: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Rating</div>
            <StarRating value={reviewRating} onChange={setReviewRating} />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Comment <span style={{ color: 'var(--ink-4)', fontWeight: 400, fontSize: 11 }}>(optional)</span></div>
            <textarea className="field" rows={4} value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience working with this person…" />
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
