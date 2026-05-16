import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getDispute, respondToDispute, submitEvidence,
  withdrawDispute, sendMessage,
} from '../../api/disputes.api';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';
import Modal from '../../components/common/Modal';

const fmtDate = (s) => s
  ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

const fmtTime = (s) => s
  ? new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  : '';

const fmtDateTime = (s) => s
  ? `${fmtDate(s)} at ${fmtTime(s)}`
  : '—';

const daysUntil = (d) => {
  if (!d) return null;
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n < 0) return { text: 'Deadline passed', hot: true };
  if (n === 0) return { text: 'Due today', hot: true };
  return { text: `${n}d remaining`, hot: n <= 2 };
};

const REASON_LABELS = {
  non_delivery:            'Non-delivery',
  quality_issues:          'Quality issues',
  scope_creep:             'Scope creep',
  payment_withheld:        'Payment withheld',
  communication_breakdown: 'Communication breakdown',
  other:                   'Other',
};

const EVIDENCE_TYPES = [
  { value: 'text',            label: 'Written statement' },
  { value: 'message_history', label: 'Message history' },
  { value: 'screenshot',      label: 'Screenshot URL' },
  { value: 'file',            label: 'File URL' },
];

const STATUS_COLORS = {
  open:         'var(--warning)',
  under_review: 'var(--accent)',
  resolved:     'var(--success)',
  withdrawn:    'var(--ink-4)',
};

const DisputeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const messagesEndRef = useRef(null);

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // chat
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // evidence modal
  const [evidenceModal, setEvidenceModal] = useState(false);
  const [evidenceType, setEvidenceType] = useState('text');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // respond modal
  const [respondModal, setRespondModal] = useState(false);
  const [respondText, setRespondText] = useState('');

  // withdraw confirm
  const [withdrawModal, setWithdrawModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getDispute(id);
      setDispute(res.data.data);
    } catch {
      toast.error('Dispute not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages?.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      await sendMessage(id, { message: msgText });
      setMsgText('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSubmitEvidence = async () => {
    const needsUrl = evidenceType === 'file' || evidenceType === 'screenshot';
    const content = needsUrl ? evidenceUrl : evidenceContent;
    if (!content.trim()) return;
    setActing(true);
    try {
      await submitEvidence(id, { type: evidenceType, content });
      toast.success('Evidence submitted');
      setEvidenceModal(false);
      setEvidenceContent('');
      setEvidenceUrl('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit evidence');
    } finally {
      setActing(false);
    }
  };

  const handleRespond = async () => {
    if (!respondText.trim()) return;
    setActing(true);
    try {
      await respondToDispute(id, { description: respondText });
      toast.success('Response submitted');
      setRespondModal(false);
      setRespondText('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setActing(false);
    }
  };

  const handleWithdraw = async () => {
    setActing(true);
    try {
      await withdrawDispute(id);
      toast.success('Dispute withdrawn');
      setWithdrawModal(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to withdraw dispute');
    } finally {
      setActing(false);
    }
  };

  if (loading) return (
    <div className="content">
      <div className="skel" style={{ height: 120, borderRadius: 'var(--r-lg)', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div className="skel" style={{ height: 480, borderRadius: 'var(--r-lg)' }} />
        <div className="skel" style={{ height: 480, borderRadius: 'var(--r-lg)' }} />
      </div>
    </div>
  );
  if (!dispute) return null;

  const isOpener     = dispute.opened_by === user?.id;
  const isRespondent = dispute.respondent_id === user?.id;
  const isOpen       = ['open', 'under_review'].includes(dispute.status);
  const deadline     = daysUntil(dispute.respondent_deadline);
  const statusColor  = STATUS_COLORS[dispute.status] || 'var(--ink-3)';

  const evidenceNeedsUrl = evidenceType === 'file' || evidenceType === 'screenshot';

  return (
    <div className="content">
      {/* breadcrumb */}
      <div className="row gap-2" style={{ marginBottom: 18 }}>
        <button className="muted" style={{ fontSize: 12 }} onClick={() => navigate('/orders')}>
          ← Orders
        </button>
        <span className="muted" style={{ fontSize: 12 }}>/</span>
        {dispute.order_id && (
          <>
            <button className="muted" style={{ fontSize: 12 }}
              onClick={() => navigate(`/orders/${dispute.order_id}`)}>
              Order #{String(dispute.order_id).padStart(4, '0')}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>/</span>
          </>
        )}
        <span style={{ fontSize: 12 }}>Dispute #{String(dispute.id).padStart(4, '0')}</span>
      </div>

      {/* header */}
      <div className="glass" style={{ padding: 26, marginBottom: 16 }}>
        <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="row gap-2" style={{ marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                background: `color-mix(in oklch, ${statusColor} 15%, transparent)`,
                color: statusColor,
                border: `1px solid color-mix(in oklch, ${statusColor} 30%, transparent)`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                {dispute.status?.replace(/_/g, ' ')}
              </span>
              <span className="eyebrow">#{String(dispute.id).padStart(4, '0')}</span>
            </div>

            <h1 className="display-3" style={{ marginBottom: 8 }}>
              Dispute: {REASON_LABELS[dispute.reason] || dispute.reason}
            </h1>

            {dispute.order?.job_title && (
              <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Regarding order:{' '}
                <button style={{ color: 'var(--accent)', fontWeight: 600 }}
                  onClick={() => navigate(`/orders/${dispute.order_id}`)}>
                  {dispute.order.job_title}
                </button>
              </div>
            )}

            <div className="row gap-4 muted" style={{ fontSize: 12, flexWrap: 'wrap' }}>
              <span>Opened {fmtDate(dispute.created_at)}</span>
              {deadline && isOpen && (
                <span className={deadline.hot ? 'coral-text' : ''} style={{ fontWeight: 600 }}>
                  Response deadline: {deadline.text}
                </span>
              )}
            </div>
          </div>

          {/* actions */}
          {isOpen && (
            <div className="col gap-2" style={{ alignItems: 'flex-end' }}>
              {isRespondent && (
                <button className="btn amber sm" onClick={() => setRespondModal(true)}>
                  Submit response
                </button>
              )}
              <button className="btn ghost sm" onClick={() => setEvidenceModal(true)}>
                <Icon name="upload" size={12} /> Add evidence
              </button>
              {isOpener && (
                <button className="btn ghost sm" style={{ color: 'var(--danger)' }}
                  onClick={() => setWithdrawModal(true)}>
                  Withdraw dispute
                </button>
              )}
            </div>
          )}
        </div>

        {/* description */}
        {dispute.description && (
          <div style={{
            marginTop: 18, padding: '14px 18px',
            background: 'color-mix(in oklch, var(--ink-4) 8%, transparent)',
            borderRadius: 10, fontSize: 13, lineHeight: 1.65,
            borderLeft: '3px solid var(--border-strong)',
          }}>
            {dispute.description}
          </div>
        )}
      </div>

      {/* body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── messages ── */}
        <div className="glass" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <h3 className="h-section">Discussion</h3>
          </div>

          {/* message thread */}
          <div style={{ padding: '18px 22px', minHeight: 280, maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {(!dispute.messages || dispute.messages.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p className="muted" style={{ fontSize: 13 }}>No messages yet. Start the discussion below.</p>
              </div>
            ) : (
              dispute.messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                    <Avatar name={m.sender_name} size={30} />
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4, textAlign: isMe ? 'right' : 'left' }}>
                        {isMe ? 'You' : m.sender_name} · {fmtTime(m.created_at)}
                      </div>
                      <div style={{
                        padding: '10px 14px', borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        fontSize: 13, lineHeight: 1.6,
                        background: isMe
                          ? 'color-mix(in oklch, var(--accent) 18%, transparent)'
                          : 'var(--surface-2)',
                        border: `1px solid ${isMe ? 'color-mix(in oklch, var(--accent) 30%, transparent)' : 'var(--border)'}`,
                      }}>
                        {m.message || m.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* message input */}
          {isOpen && (
            <form onSubmit={handleSendMessage} style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <input className="field" style={{ flex: 1 }}
                placeholder="Add to the discussion…"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                disabled={sendingMsg}
              />
              <button type="submit" className="btn amber sm" disabled={sendingMsg || !msgText.trim()}>
                {sendingMsg ? '…' : 'Send'}
              </button>
            </form>
          )}
        </div>

        {/* ── right sidebar ── */}
        <div className="col gap-4">

          {/* dispute meta */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="label" style={{ marginBottom: 14 }}>Dispute info</div>
            <div className="col gap-3">
              {[
                { label: 'Reason',  value: REASON_LABELS[dispute.reason] || dispute.reason },
                { label: 'Opened',  value: fmtDate(dispute.created_at) },
                { label: 'Updated', value: fmtDate(dispute.updated_at) },
                ...(dispute.respondent_deadline ? [{ label: 'Respond by', value: fmtDate(dispute.respondent_deadline) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="row between" style={{ fontSize: 12 }}>
                  <span className="muted">{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* parties */}
            {dispute.order && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div className="label" style={{ marginBottom: 10 }}>Parties</div>
                {[
                  { role: 'Client',     name: dispute.order.client_name,     uid: dispute.order.client_id },
                  { role: 'Freelancer', name: dispute.order.freelancer_name, uid: dispute.order.freelancer_id },
                ].map(({ role, name, uid }) => (
                  <div key={role} className="row gap-2" style={{ alignItems: 'center', marginBottom: 10 }}>
                    <Avatar name={name} size={28} />
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-4)', letterSpacing: 0.5 }}>{role}</div>
                      <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}
                        onClick={() => navigate(`/profile/${uid}`)}>
                        {name}
                      </button>
                    </div>
                    {uid === dispute.opened_by && (
                      <span style={{ fontSize: 10, color: 'var(--warning)', marginLeft: 'auto' }}>Opener</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* evidence */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <div className="label">Evidence</div>
              {isOpen && (
                <button className="btn ghost sm" style={{ fontSize: 11 }} onClick={() => setEvidenceModal(true)}>
                  + Add
                </button>
              )}
            </div>
            {(!dispute.evidence || dispute.evidence.length === 0) ? (
              <p className="muted" style={{ fontSize: 12 }}>No evidence submitted yet.</p>
            ) : (
              <div className="col gap-3">
                {dispute.evidence.map((ev) => (
                  <div key={ev.id} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                  }}>
                    <div className="row between" style={{ marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700,
                        color: 'var(--accent)',
                      }}>
                        {ev.type?.replace(/_/g, ' ')}
                      </span>
                      <span className="muted" style={{ fontSize: 10 }}>{fmtDate(ev.created_at)}</span>
                    </div>
                    {ev.content && (
                      <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: ev.file_url ? 6 : 0 }}>
                        {ev.content}
                      </p>
                    )}
                    {ev.file_url && (
                      <a href={ev.file_url} target="_blank" rel="noreferrer"
                        className="row gap-1" style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                        <Icon name="link" size={11} /> View file
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* resolution notice */}
          {!isOpen && (
            <div style={{
              padding: '16px 18px', borderRadius: 10,
              background: `color-mix(in oklch, ${statusColor} 10%, transparent)`,
              border: `1px solid color-mix(in oklch, ${statusColor} 25%, transparent)`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: statusColor, marginBottom: 6 }}>
                {dispute.status === 'withdrawn' ? 'Dispute withdrawn' : 'Dispute resolved'}
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                {dispute.status === 'withdrawn'
                  ? 'The opener withdrew this dispute.'
                  : dispute.resolution === 'release_to_freelancer'
                  ? 'Resolved in the freelancer\'s favour — funds released.'
                  : dispute.resolution === 'refund_to_client'
                  ? 'Resolved in the client\'s favour — payment refunded.'
                  : dispute.resolution === 'partial_split'
                  ? `Resolved with a partial split${dispute.split_client_pct != null ? ` (${dispute.split_client_pct}% to client)` : ''}.`
                  : dispute.resolution_note || 'This dispute has been closed.'}
              </p>
              {dispute.resolution_note && dispute.status !== 'withdrawn' && (
                <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontStyle: 'italic' }}>
                  Admin note: {dispute.resolution_note}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Add evidence */}
      <Modal open={evidenceModal} onClose={() => setEvidenceModal(false)} title="Submit evidence" width={500}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          All evidence is visible to both parties and the dispute resolution team.
        </p>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Evidence type</div>
            <select className="field" value={evidenceType} onChange={(e) => { setEvidenceType(e.target.value); setEvidenceContent(''); setEvidenceUrl(''); }}>
              {EVIDENCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {evidenceNeedsUrl ? (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>URL</div>
              <input className="field" placeholder="https://…"
                value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
            </div>
          ) : (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>
                {evidenceType === 'message_history' ? 'Paste message history' : 'Statement'}
              </div>
              <textarea className="field" rows={5} value={evidenceContent}
                onChange={(e) => setEvidenceContent(e.target.value)}
                placeholder={evidenceType === 'message_history'
                  ? 'Paste the relevant messages here…'
                  : 'Provide your written statement or description of events…'} />
            </div>
          )}
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEvidenceModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }}
            disabled={acting || (evidenceNeedsUrl ? !evidenceUrl.trim() : !evidenceContent.trim())}
            onClick={handleSubmitEvidence}>
            {acting ? 'Submitting…' : 'Submit evidence'}
          </button>
        </div>
      </Modal>

      {/* Respond */}
      <Modal open={respondModal} onClose={() => setRespondModal(false)} title="Submit your response" width={500}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Provide your side of the story. Be specific and factual — this will be reviewed by our team.
        </p>
        <div className="col gap-3" style={{ marginBottom: 22 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Your response</div>
            <textarea className="field" rows={6} value={respondText}
              onChange={(e) => setRespondText(e.target.value)}
              placeholder="Explain your position, what was agreed, and any relevant context…" />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setRespondModal(false)}>Cancel</button>
          <button className="btn amber" style={{ flex: 1 }} disabled={acting || !respondText.trim()} onClick={handleRespond}>
            {acting ? 'Submitting…' : 'Submit response'}
          </button>
        </div>
      </Modal>

      {/* Withdraw */}
      <Modal open={withdrawModal} onClose={() => setWithdrawModal(false)} title="Withdraw dispute?" width={440}>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, marginBottom: 22 }}>
          Withdrawing will close this dispute and allow the order to continue. The other party will be notified.
          This action cannot be undone.
        </p>
        <div className="row gap-2">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setWithdrawModal(false)}>Cancel</button>
          <button className="btn danger" style={{ flex: 1 }} disabled={acting} onClick={handleWithdraw}>
            {acting ? 'Withdrawing…' : 'Withdraw dispute'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DisputeDetail;
