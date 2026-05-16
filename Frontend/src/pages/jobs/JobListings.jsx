import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobs, getCategories } from '../../api/jobs.api';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import StatusPill from '../../components/common/StatusPill';

const daysUntil = (d) => {
  if (!d) return null;
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, hot: true };
  if (n === 0) return { text: 'Due today', hot: true };
  return { text: `${n}d left`, hot: n <= 4 };
};
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const SORT_OPTIONS = [
  { k: 'newest',   l: 'Newest' },
  { k: 'budget',   l: 'Highest budget' },
  { k: 'deadline', l: 'Soonest deadline' },
];

const JobListings = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cat, setCat] = useState('all');
  const [skill, setSkill] = useState('');
  const [q, setQ] = useState('');
  const [budget, setBudget] = useState(15000);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 1) => {
      try {
        const r = await getCategories();
        const list = r.data?.data || [];
        if (cancelled) return;
        if (list.length === 0 && attempt < 3) { setTimeout(() => load(attempt + 1), 1500); return; }
        setCategories(list);
      } catch {
        if (!cancelled && attempt < 3) setTimeout(() => load(attempt + 1), 1500);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const sortMap = { newest: { sort: 'created_at', order: 'desc' }, budget: { sort: 'budget_max', order: 'desc' }, deadline: { sort: 'deadline', order: 'asc' } };
      const params = { page, limit: 15, status: 'open', ...sortMap[sort] };
      if (cat !== 'all') params.category_id = cat;
      if (skill) params.skill = skill;
      if (q) params.search = q;
      if (budget < 15000) params.budget_max = budget;
      const res = await getJobs(params);
      setJobs(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, cat, skill, q, budget]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const reset = () => { setCat('all'); setSkill(''); setQ(''); setBudget(15000); setSort('newest'); setPage(1); };

  return (
    <div className="content">
      {/* header */}
      <div className="row between" style={{ marginBottom: 24, alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Open briefs</div>
          <h1 className="display-2" style={{ marginBottom: 6 }}>Browse <span className="display-italic">work</span>.</h1>
          <p className="muted">{pagination?.total ?? jobs.length} brief{(pagination?.total ?? jobs.length) !== 1 ? 's' : ''} available</p>
        </div>
        <div className="row gap-2 wrap">
          {SORT_OPTIONS.map((o) => (
            <button key={o.k} className={`chip ${sort === o.k ? 'solid' : ''}`} onClick={() => { setSort(o.k); setPage(1); }}>{o.l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
        {/* filters sidebar */}
        <aside className="glass" style={{ padding: 22, alignSelf: 'start', position: 'sticky', top: 8 }}>
          <div className="row between" style={{ marginBottom: 18 }}>
            <div className="eyebrow">Filters</div>
            <button className="muted" style={{ fontSize: 11 }} onClick={reset}>Reset</button>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div className="label" style={{ marginBottom: 8 }}>Search</div>
            <input className="field" placeholder="Title or keyword" value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ height: 38 }} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <div className="label" style={{ marginBottom: 8 }}>Category</div>
            <div className="col gap-2">
              <button className={`chip ${cat === 'all' ? 'solid' : ''}`} style={{ justifyContent: 'flex-start', height: 30 }} onClick={() => { setCat('all'); setPage(1); }}>
                All categories
              </button>
              {categories.map((c) => (
                <button key={c.id} className={`chip ${cat === String(c.id) ? 'solid' : ''}`} style={{ justifyContent: 'flex-start', height: 30 }}
                  onClick={() => { setCat(String(c.id)); setPage(1); }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div className="label row between" style={{ marginBottom: 8 }}>
              <span>Max budget</span>
              <span className="num muted" style={{ textTransform: 'none' }}>${(budget / 1000).toFixed(0)}k</span>
            </div>
            <input type="range" min="1000" max="15000" step="500" value={budget}
              onChange={(e) => { setBudget(+e.target.value); setPage(1); }}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>Skill</div>
            <input className="field" placeholder="e.g. React" value={skill}
              onChange={(e) => { setSkill(e.target.value); setPage(1); }} style={{ height: 38 }} />
          </div>
        </aside>

        {/* job list */}
        <div className="col gap-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 160, borderRadius: 'var(--r-lg)' }} />
            ))
          ) : jobs.length === 0 ? (
            <div className="glass" style={{ padding: 64, textAlign: 'center' }}>
              <div className="display-3" style={{ marginBottom: 6 }}>No briefs match.</div>
              <p className="muted">Try widening your filters.</p>
              <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={reset}>Reset filters</button>
            </div>
          ) : jobs.map((j) => {
            const due = daysUntil(j.deadline);
            return (
              <button
                key={j.id}
                className="glass"
                style={{ padding: 22, textAlign: 'left', display: 'block', transition: 'transform .15s, box-shadow .15s' }}
                onClick={() => navigate(`/jobs/${j.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px -8px oklch(0 0 0 / 0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12, gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row gap-3" style={{ marginBottom: 8 }}>
                      <span className="eyebrow">{j.category_name || j.category}</span>
                      <span className="muted" style={{ fontSize: 11 }}>· posted {fmtDate(j.created_at)}</span>
                    </div>
                    <h3 className="display-3" style={{ marginBottom: 8 }}>{j.title}</h3>
                    <p className="muted line-clamp-2" style={{ fontSize: 13, marginBottom: 12 }}>{j.description}</p>
                    <div className="row gap-2 wrap">
                      {(j.skills_required || []).map((s) => <span key={s} className="chip">{s}</span>)}
                    </div>
                  </div>
                  <div className="col gap-2" style={{ alignItems: 'flex-end', textAlign: 'right', minWidth: 140 }}>
                    <div className="num amber-text" style={{ fontSize: 22, fontWeight: 500 }}>
                      ${Math.round(j.budget_min / 1000)}–${Math.round(j.budget_max / 1000)}k
                    </div>
                    {due && (
                      <span className={`status ${due.hot ? 'rejected' : 'open'}`}>
                        <Icon name="clock" size={11} /> {due.text}
                      </span>
                    )}
                    <span className="muted" style={{ fontSize: 11 }}>{j.bid_count || 0} proposal{j.bid_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="row gap-2" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <Avatar name={j.client_name} size={22} />
                  <span style={{ fontSize: 12 }}>{j.client_name}</span>
                  <span style={{ flex: 1 }} />
                  <span className="amber-text row gap-2" style={{ fontSize: 12, fontWeight: 600 }}>
                    View brief <Icon name="arrow-right" size={12} />
                  </span>
                </div>
              </button>
            );
          })}

          {/* pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="row between" style={{ marginTop: 12, padding: '12px 4px' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="row gap-2">
                <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`chip ${p === page ? 'solid' : ''}`} style={{ width: 28, justifyContent: 'center' }} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn ghost sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobListings;
