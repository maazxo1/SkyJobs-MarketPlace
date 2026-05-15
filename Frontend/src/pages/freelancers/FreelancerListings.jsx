import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFreelancers } from '../../api/users.api';
import Icon from '../../components/common/Icon';
import Avatar from '../../components/common/Avatar';
import { Stars } from '../../components/common/StarRating';

const FreelancerListings = () => {
  const [freelancers, setFreelancers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxRate, setMaxRate] = useState(500);
  const [page, setPage] = useState(1);

  const fetchFreelancers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (skill) params.skill = skill;
      if (availableOnly) params.available = 'true';
      if (maxRate < 500) params.max_rate = maxRate;
      const res = await getFreelancers(params);
      setFreelancers(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      setFreelancers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, skill, availableOnly, maxRate]);

  useEffect(() => { fetchFreelancers(); }, [fetchFreelancers]);

  const reset = () => {
    setSearch(''); setSkill(''); setAvailableOnly(false); setMaxRate(500); setPage(1);
  };

  return (
    <div className="content">
      {/* header */}
      <div className="row between" style={{ marginBottom: 24, alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Talent directory</div>
          <h1 className="display-2" style={{ marginBottom: 6 }}>Browse <span className="display-italic">talent</span>.</h1>
          <p className="muted">{pagination?.total ?? freelancers.length} freelancer{(pagination?.total ?? freelancers.length) !== 1 ? 's' : ''} available</p>
        </div>
        <div className="row gap-2 wrap">
          <button className={`chip ${availableOnly ? 'solid' : ''}`} onClick={() => { setAvailableOnly((p) => !p); setPage(1); }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success, #22c55e)', display: 'inline-block' }} />
            Available now
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        {/* filters sidebar */}
        <aside className="glass" style={{ padding: 22, alignSelf: 'start', position: 'sticky', top: 8 }}>
          <div className="row between" style={{ marginBottom: 18 }}>
            <div className="eyebrow">Filters</div>
            <button className="muted" style={{ fontSize: 11 }} onClick={reset}>Reset</button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 8 }}>Search name</div>
            <input className="field" placeholder="e.g. Jane" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ height: 38 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 8 }}>Skill</div>
            <input className="field" placeholder="e.g. React" value={skill}
              onChange={(e) => { setSkill(e.target.value); setPage(1); }} style={{ height: 38 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="label row between" style={{ marginBottom: 8 }}>
              <span>Max rate</span>
              <span className="num muted" style={{ textTransform: 'none' }}>${maxRate}/hr</span>
            </div>
            <input type="range" min="20" max="500" step="10" value={maxRate}
              onChange={(e) => { setMaxRate(+e.target.value); setPage(1); }}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>

          <div>
            <label className="row gap-3" style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => { setAvailableOnly((p) => !p); setPage(1); }}>
              <div style={{
                width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
                background: availableOnly ? 'var(--accent)' : 'var(--border)',
                transition: 'background .2s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: availableOnly ? 18 : 2, width: 16, height: 16,
                  borderRadius: '50%', background: '#fff', transition: 'left .2s',
                }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Available only</span>
            </label>
          </div>
        </aside>

        {/* freelancer grid */}
        <div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 200, borderRadius: 'var(--r-lg)' }} />
              ))}
            </div>
          ) : freelancers.length === 0 ? (
            <div className="glass" style={{ padding: 64, textAlign: 'center' }}>
              <div className="display-3" style={{ marginBottom: 6 }}>No talent found.</div>
              <p className="muted">Try widening your filters.</p>
              <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={reset}>Reset filters</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
                {freelancers.map((f) => (
                  <div key={f.id} className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* header */}
                    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={f.name} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row between" style={{ gap: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          {f.hourly_rate && (
                            <div className="num amber-text" style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                              ${Number(f.hourly_rate).toLocaleString()}<span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>/hr</span>
                            </div>
                          )}
                        </div>
                        <div className="row gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
                            color: f.availability ? 'var(--success, #22c55e)' : 'var(--ink-3)',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.availability ? 'var(--success, #22c55e)' : 'var(--ink-3)', flexShrink: 0 }} />
                            {f.availability ? 'Available' : 'Unavailable'}
                          </span>
                          {f.avg_rating && (
                            <>
                              <span className="muted">·</span>
                              <Stars rating={f.avg_rating} size="sm" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* bio */}
                    {f.bio && (
                      <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {f.bio}
                      </p>
                    )}

                    {/* skills */}
                    {(f.skills || []).length > 0 && (
                      <div className="row gap-1 wrap">
                        {(f.skills || []).slice(0, 4).map((s) => (
                          <span key={s} className="chip" style={{ fontSize: 11 }}>{s}</span>
                        ))}
                        {(f.skills || []).length > 4 && (
                          <span className="chip muted" style={{ fontSize: 11 }}>+{(f.skills || []).length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* footer */}
                    <div className="row between" style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {f.jobs_completed > 0 ? `${f.jobs_completed} job${f.jobs_completed !== 1 ? 's' : ''} done` : 'New'}
                      </span>
                      <Link to={`/profile/${f.id}`}
                        className="amber-text row gap-1" style={{ fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        View profile <Icon name="arrow-right" size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="row between" style={{ padding: '12px 4px' }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <div className="row gap-2">
                    <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map((p) => (
                      <button key={p} className={`chip ${p === page ? 'solid' : ''}`}
                        style={{ width: 28, justifyContent: 'center' }} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="btn ghost sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreelancerListings;
