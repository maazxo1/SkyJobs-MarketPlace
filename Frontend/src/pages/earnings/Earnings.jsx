import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyEarnings } from '../../api/users.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/common/Pagination';

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_STYLE = {
  pending_clearance: { bg: 'color-mix(in oklch, var(--warning) 12%, transparent)', color: 'var(--warning)', label: 'Clearing' },
  available:         { bg: 'color-mix(in oklch, var(--success) 12%, transparent)', color: 'var(--success)', label: 'Available' },
  processing:        { bg: 'color-mix(in oklch, var(--accent) 12%, transparent)', color: 'var(--accent)', label: 'Processing' },
  paid:              { bg: 'color-mix(in oklch, var(--ink-3) 12%, transparent)', color: 'var(--ink-3)', label: 'Paid' },
  failed:            { bg: 'color-mix(in oklch, var(--danger) 12%, transparent)', color: 'var(--danger)', label: 'Failed' },
};

const StatCard = ({ label, amount, sub, accent }) => (
  <div style={{
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '20px 24px',
    flex: 1, minWidth: 180,
  }}>
    <p style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
      {label}
    </p>
    <p style={{ fontSize: 26, fontWeight: 800, color: accent || 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
      {fmtMoney(amount)}
    </p>
    {sub && <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0 }}>{sub}</p>}
  </div>
);

const Earnings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getMyEarnings({ page, limit: 15, ...(statusFilter ? { status: statusFilter } : {}) });
      setData(res.data);
    } catch {
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (user?.role !== 'freelancer') {
      navigate('/dashboard');
      return;
    }
    load();
  }, [load, user, navigate]);

  const earnings = data?.data?.earnings || [];
  const meta = data?.meta || {};
  const pending   = data?.data?.total_pending   || 0;
  const available = data?.data?.total_available || 0;
  const paid      = data?.data?.total_paid      || 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Earnings
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
          Track your payouts and payment clearance status.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard label="Clearing" amount={pending} sub="7-day clearance window" accent="var(--warning)" />
        <StatCard label="Available" amount={available} sub="Ready for withdrawal" accent="var(--success)" />
        <StatCard label="Total paid" amount={paid} sub="All-time lifetime earnings" />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'pending_clearance', 'available', 'paid', 'processing', 'failed'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              borderColor: statusFilter === s ? 'var(--accent)' : 'var(--border)',
              background: statusFilter === s ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'transparent',
              color: statusFilter === s ? 'var(--accent)' : 'var(--ink-3)',
              transition: 'all .15s',
            }}
          >
            {s ? (STATUS_STYLE[s]?.label || s) : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              height: 64, borderRadius: 12,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              animation: 'pulse 1.5s ease infinite',
            }} />
          ))}
        </div>
      ) : earnings.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <h3 style={{ color: 'var(--ink)', margin: '0 0 8px' }}>No earnings yet</h3>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>
            Complete orders to start earning. Payments appear here after approval.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px 110px',
              padding: '8px 16px',
              fontSize: 11, fontWeight: 700, color: 'var(--ink-4)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              <span>Job</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'center' }}>Status</span>
              <span style={{ textAlign: 'right' }}>Date</span>
            </div>

            {earnings.map((row) => {
              const style = STATUS_STYLE[row.status] || { bg: 'transparent', color: 'var(--ink-3)', label: row.status };
              return (
                <div
                  key={row.id}
                  onClick={() => navigate(`/orders/${row.order_id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px 110px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 12, cursor: 'pointer',
                    transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.background = 'var(--bg-3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-2)';
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.job_title || 'Untitled order'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0 }}>
                      Order #{row.order_id}
                      {row.available_at && row.status === 'pending_clearance' && (
                        <span style={{ marginLeft: 8, color: 'var(--warning)' }}>
                          Available {fmtDate(row.available_at)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                      {fmtMoney(row.amount)}
                    </p>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                      background: style.bg, color: style.color,
                    }}>
                      {style.label}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
                      {fmtDate(row.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {meta.total > meta.limit && (
            <div style={{ marginTop: 24 }}>
              <Pagination
                page={meta.page}
                totalPages={Math.ceil(meta.total / meta.limit)}
                onPageChange={(p) => { setPage(p); window.scrollTo(0, 0); }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Earnings;
