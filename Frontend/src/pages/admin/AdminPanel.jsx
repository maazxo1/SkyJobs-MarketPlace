import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, banUser, getContracts, getAdminJobs, adminDeleteJob, getStats } from '../../api/admin.api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Icon from '../../components/common/Icon';

const TABS = [
  { id: 'overview',  l: 'Overview'  },
  { id: 'users',     l: 'Users'     },
  { id: 'jobs',      l: 'Briefs'    },
  { id: 'contracts', l: 'Contracts' },
];

const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const AdminPanel = () => {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);

  const fetchStats = async () => {
    try {
      const r = await getStats();
      setStats(r.data.data);
    } catch { /* stats optional */ }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'users')     res = await getUsers({ page, limit: 20, search });
      else if (tab === 'jobs') res = await getAdminJobs({ page, limit: 20, search });
      else if (tab === 'contracts') res = await getContracts();
      else { await fetchStats(); setLoading(false); return; }
      setData(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch {
      toast.error('Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'overview') { fetchStats(); setLoading(false); }
    else fetchData();
  }, [tab, page, search]);

  const handleBan = async (userId, isBanned) => {
    try {
      await banUser(userId);
      toast.success(isBanned ? 'User unbanned' : 'User banned');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await adminDeleteJob(jobId);
      toast.success('Brief deleted');
      setDeleteModal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="content">
      {/* header */}
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ color: 'var(--danger)', marginBottom: 6 }}>Administration</div>
        <h1 className="display-2" style={{ marginBottom: 6 }}>Control <span className="display-italic">room</span>.</h1>
        <p className="muted">Platform management — users, briefs, contracts.</p>
      </div>

      {/* tabs */}
      <div className="row gap-2" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`chip ${tab === t.id ? 'solid' : ''}`}
            onClick={() => { setTab(t.id); setPage(1); setSearch(''); }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* overview */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { l: 'Total users',     v: stats?.total_users,     icon: 'briefcase' },
              { l: 'Total briefs',    v: stats?.total_jobs,      icon: 'briefcase' },
              { l: 'Total proposals', v: stats?.total_bids,      icon: 'briefcase' },
              { l: 'Contracts',       v: stats?.total_contracts, icon: 'briefcase' },
            ].map((s) => (
              <div key={s.l} className="glass" style={{ padding: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>{s.l}</div>
                <div className="num amber-text" style={{ fontSize: 32, fontWeight: 600 }}>
                  {s.v?.toLocaleString() ?? '—'}
                </div>
              </div>
            ))}
          </div>

          {stats?.jobs_by_status && (
            <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
              <div className="label" style={{ marginBottom: 16 }}>Briefs by status</div>
              <div className="col gap-3">
                {stats.jobs_by_status.map(({ status, count }) => {
                  const pct = Math.round((Number(count) / (stats.total_jobs || 1)) * 100);
                  return (
                    <div key={status}>
                      <div className="row between" style={{ marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                        <span className="muted">{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
            {['users', 'jobs', 'contracts'].map((t) => (
              <button key={t} className="btn ghost sm" onClick={() => setTab(t)}>
                Manage {t} <Icon name="arrow-right" size={12} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* search */}
      {(tab === 'users' || tab === 'jobs') && (
        <div style={{ marginBottom: 16, maxWidth: 340 }}>
          <input className="field" style={{ height: 38 }}
            placeholder={`Search ${tab}…`} value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      )}

      {/* users table */}
      {tab === 'users' && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div className="col gap-2" style={{ padding: 16 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p className="muted">No users found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['User', 'Role', 'Status', 'Joined', 'Action'].map((h) => (
                      <th key={h} className="eyebrow" style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div className="row gap-3">
                          <Avatar name={u.name} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            <div className="muted" style={{ fontSize: 11 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`status ${u.role === 'admin' ? 'active' : u.role === 'client' ? 'open' : 'closed'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`status ${u.is_banned ? 'rejected' : 'active'}`}>
                          {u.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }} className="muted">
                        <span style={{ fontSize: 12 }}>{fmtDate(u.created_at)}</span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {u.role !== 'admin' && (
                          <button
                            className={`chip ${u.is_banned ? '' : 'solid'}`}
                            style={{ fontSize: 11, color: u.is_banned ? 'var(--ink-2)' : 'var(--danger)' }}
                            onClick={() => handleBan(u.id, u.is_banned)}>
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* jobs table */}
      {tab === 'jobs' && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div className="col gap-2" style={{ padding: 16 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p className="muted">No briefs found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Brief', 'Category', 'Status', 'Posted', 'Action'].map((h) => (
                      <th key={h} className="eyebrow" style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((j) => (
                    <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px', maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Link to={`/jobs/${j.id}`} style={{ color: 'var(--ink)' }}>{j.title}</Link>
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>by {j.client_name}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }} className="muted">
                        <span style={{ fontSize: 12 }}>{j.category_name}</span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`status ${j.status === 'open' ? 'open' : j.status === 'closed' ? 'closed' : 'active'}`}>
                          {j.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }} className="muted">
                        <span style={{ fontSize: 12 }}>{fmtDate(j.created_at)}</span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <button className="chip solid" style={{ fontSize: 11, color: 'var(--danger)' }}
                          onClick={() => setDeleteModal(j.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* contracts table */}
      {tab === 'contracts' && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div className="col gap-2" style={{ padding: 16 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p className="muted">No contracts found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Brief', 'Client', 'Freelancer', 'Amount', 'Status', 'Date'].map((h) => (
                      <th key={h} className="eyebrow" style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px', maxWidth: 220 }}>
                        <span style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', display: 'block' }}>{c.job_title}</span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 13 }}>{c.client_name}</td>
                      <td style={{ padding: '14px 18px', fontSize: 13 }}>{c.freelancer_name}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className="num amber-text" style={{ fontWeight: 600, fontSize: 13 }}>
                          ${Number(c.amount).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`status ${c.status === 'active' ? 'active' : c.status === 'completed' ? 'open' : 'closed'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }} className="muted">
                        <span style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* pagination */}
      {pagination && pagination.pages > 1 && tab !== 'overview' && (
        <div className="row between" style={{ marginTop: 16, padding: '8px 4px' }}>
          <span className="muted" style={{ fontSize: 12 }}>Page {page} of {pagination.pages}</span>
          <div className="row gap-2">
            <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <button className="btn ghost sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* delete modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete this brief?">
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
          This will permanently remove the brief and all associated proposals. This cannot be undone.
        </p>
        <div className="row gap-3">
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDeleteModal(null)}>Cancel</button>
          <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}
            onClick={() => handleDeleteJob(deleteModal)}>
            Delete brief
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPanel;
