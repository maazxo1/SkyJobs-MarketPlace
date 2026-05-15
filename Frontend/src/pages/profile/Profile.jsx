import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { getReviews } from '../../api/reviews.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Icon from '../../components/common/Icon';
import { Stars } from '../../components/common/StarRating';

const parseSkills = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const fmtMonth = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [reviewsData, setReviewsData] = useState({ reviews: [], avg_rating: null, total: 0 });
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const isOwn = user?.id === Number(id);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      const p = res.data.data;
      setProfile(p);
      setForm({
        name:          p.name || '',
        bio:           p.bio || '',
        skills:        parseSkills(p.freelancer_profile?.skills).join(', '),
        hourly_rate:   p.freelancer_profile?.hourly_rate || '',
        portfolio_url: p.freelancer_profile?.portfolio_url || '',
      });
    } catch {
      toast.error('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    getReviews(id)
      .then((r) => setReviewsData(r.data.data))
      .catch(() => {});
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${id}`, {
        name:          form.name,
        bio:           form.bio,
        skills:        form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        hourly_rate:   form.hourly_rate ? Number(form.hourly_rate) : undefined,
        portfolio_url: form.portfolio_url || undefined,
      });
      toast.success('Profile updated');
      setEditModal(false);
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="content">
      <div className="glass" style={{ padding: 28, marginBottom: 20 }}>
        <div className="row gap-4" style={{ alignItems: 'flex-end' }}>
          <div className="skel" style={{ width: 72, height: 72, borderRadius: 18, flexShrink: 0 }} />
          <div className="col gap-2" style={{ flex: 1 }}>
            <div className="skel" style={{ width: 180, height: 20, borderRadius: 8 }} />
            <div className="skel" style={{ width: 120, height: 14, borderRadius: 6 }} />
          </div>
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skel" style={{ height: 160, borderRadius: 'var(--r-lg)', marginBottom: 16 }} />
      ))}
    </div>
  );

  if (!profile) return null;

  const skills      = parseSkills(profile.freelancer_profile?.skills);
  const fp          = profile.freelancer_profile;
  const isFreelancer = profile.role === 'freelancer';

  return (
    <div className="content">
      {/* hero card */}
      <div className="glass" style={{ padding: 28, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        {/* background bloom */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 80% 50%, var(--bloom-1) 0%, transparent 65%)',
        }} />

        <div className="row between" style={{ alignItems: 'flex-start', position: 'relative', gap: 16, flexWrap: 'wrap' }}>
          <div className="row gap-4" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Avatar name={profile.name} size={72} square />
            <div>
              <div className="row gap-2" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                <span className={`status ${isFreelancer ? 'active' : 'open'}`}>
                  {isFreelancer ? 'Freelancer' : 'Client'}
                </span>
                {fp?.availability && <span className="status active">Available</span>}
                {profile.trust_level && profile.trust_level !== 'new' && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: profile.trust_level === 'trusted' || profile.trust_level === 'elite'
                      ? 'color-mix(in oklch, var(--success) 15%, transparent)'
                      : 'color-mix(in oklch, var(--accent) 15%, transparent)',
                    color: profile.trust_level === 'trusted' || profile.trust_level === 'elite'
                      ? 'var(--success)'
                      : 'var(--accent)',
                  }}>
                    {profile.trust_level === 'elite' ? '★ Elite' : profile.trust_level === 'trusted' ? '✓ Trusted' : profile.trust_level}
                  </span>
                )}
                {reviewsData.avg_rating && (
                  <span className="row gap-1" style={{ fontSize: 12 }}>
                    <Stars rating={reviewsData.avg_rating} size="sm" />
                    <span className="muted">{Number(reviewsData.avg_rating).toFixed(1)} ({reviewsData.total})</span>
                  </span>
                )}
              </div>
              <h1 className="display-2" style={{ marginBottom: 4 }}>{profile.name}</h1>
              {fp?.hourly_rate && (
                <div className="row gap-1" style={{ fontSize: 14 }}>
                  <span className="num amber-text" style={{ fontWeight: 600 }}>
                    ${Number(fp.hourly_rate).toLocaleString()}
                  </span>
                  <span className="muted">/hr</span>
                </div>
              )}
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Member since {fmtMonth(profile.created_at)}
              </div>
            </div>
          </div>
          <div className="row gap-2">
            {fp?.portfolio_url && (
              <a href={fp.portfolio_url} target="_blank" rel="noopener noreferrer"
                className="btn ghost sm">
                Portfolio <Icon name="arrow-right" size={12} />
              </a>
            )}
            {isOwn && (
              <button className="btn ghost sm" onClick={() => setEditModal(true)}>
                <Icon name="settings" size={13} /> Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      {isFreelancer ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          {/* left */}
          <div className="col gap-4">
            {/* bio */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 12 }}>About</div>
              {profile.bio ? (
                <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--ink-2)' }}>{profile.bio}</p>
              ) : isOwn ? (
                <div style={{ padding: '14px 16px', background: 'color-mix(in oklch, var(--accent) 8%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)', borderRadius: 10,
                  fontSize: 13, color: 'var(--accent)' }}>
                  Your profile is missing a bio.{' '}
                  <button onClick={() => setEditModal(true)} style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--accent)' }}>
                    Add one now
                  </button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No bio provided.</p>
              )}
            </div>

            {/* skills */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 12 }}>Skills</div>
              {skills.length > 0 ? (
                <div className="row gap-2 wrap">
                  {skills.map((s) => <span key={s} className="chip solid">{s}</span>)}
                </div>
              ) : isOwn ? (
                <div style={{ padding: '14px 16px', background: 'color-mix(in oklch, var(--accent) 8%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)', borderRadius: 10,
                  fontSize: 13, color: 'var(--accent)' }}>
                  Add your skills so clients can find you.{' '}
                  <button onClick={() => setEditModal(true)} style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--accent)' }}>
                    Edit profile
                  </button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No skills listed.</p>
              )}
            </div>

            {/* reviews */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="row between" style={{ marginBottom: 16 }}>
                <div className="label">Reviews</div>
                {reviewsData.total > 0 && (
                  <div className="row gap-2">
                    <Stars rating={reviewsData.avg_rating} size="sm" />
                    <span className="muted" style={{ fontSize: 12 }}>{Number(reviewsData.avg_rating).toFixed(1)}</span>
                    <span className="chip" style={{ fontSize: 11 }}>{reviewsData.total}</span>
                  </div>
                )}
              </div>
              {reviewsData.reviews.length === 0 ? (
                <p className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No reviews yet.</p>
              ) : (
                <div className="col">
                  {reviewsData.reviews.map((r, i) => (
                    <div key={r.id} style={{
                      padding: '16px 0',
                      borderBottom: i < reviewsData.reviews.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                        <Avatar name={r.reviewer_name} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row gap-2" style={{ marginBottom: 4, flexWrap: 'wrap' }}>
                            <Stars rating={r.rating} size="sm" />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{r.reviewer_name}</span>
                            {r.job_title && (
                              <>
                                <span className="muted">·</span>
                                <span className="muted" style={{ fontSize: 12, maxWidth: 180,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.job_title}
                                </span>
                              </>
                            )}
                          </div>
                          {r.comment && (
                            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{r.comment}</p>
                          )}
                          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                            {fmtMonth(r.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* right sidebar */}
          <div className="col gap-3" style={{ position: 'sticky', top: 8 }}>
            <div className="glass" style={{ padding: 22 }}>
              <div className="label" style={{ marginBottom: 14 }}>Details</div>
              <div className="col gap-3">
                {fp?.hourly_rate && (
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="muted">Hourly rate</span>
                    <span className="amber-text num" style={{ fontWeight: 600 }}>
                      ${Number(fp.hourly_rate).toLocaleString()}<span className="muted" style={{ fontWeight: 400 }}>/hr</span>
                    </span>
                  </div>
                )}
                {(profile.jobs_completed ?? 0) > 0 && (
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="muted">Jobs completed</span>
                    <span style={{ fontWeight: 600 }}>{profile.jobs_completed}</span>
                  </div>
                )}
                {reviewsData.total > 0 && (
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="muted">Reviews</span>
                    <span className="row gap-1" style={{ fontWeight: 600 }}>
                      <Stars rating={reviewsData.avg_rating} size="sm" />
                      {Number(reviewsData.avg_rating).toFixed(1)}
                      <span className="muted" style={{ fontWeight: 400 }}>({reviewsData.total})</span>
                    </span>
                  </div>
                )}
                {profile.trust_score != null && (
                  <div className="row between" style={{ fontSize: 13 }}>
                    <span className="muted">Trust score</span>
                    <span style={{ fontWeight: 600 }}>{profile.trust_score}</span>
                  </div>
                )}
                <div className="row between" style={{ fontSize: 13 }}>
                  <span className="muted">Availability</span>
                  <span className="row gap-1" style={{ fontWeight: 500, alignItems: 'center' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: fp?.availability ? 'var(--success, #22c55e)' : 'var(--ink-3)', flexShrink: 0 }} />
                    {fp?.availability ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="row between" style={{ fontSize: 13 }}>
                  <span className="muted">Member since</span>
                  <span style={{ fontWeight: 500 }}>{fmtMonth(profile.created_at)}</span>
                </div>
              </div>

              {fp?.portfolio_url && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <a href={fp.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="btn ghost sm" style={{ width: '100%', justifyContent: 'center' }}>
                    View portfolio <Icon name="arrow-right" size={12} />
                  </a>
                </div>
              )}
            </div>

            {!isOwn && (
              <Link to="/jobs" className="btn amber" style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                Browse briefs <Icon name="arrow-right" size={14} />
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* client layout */
        <div style={{ maxWidth: 640 }}>
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>About</div>
            {profile.bio ? (
              <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--ink-2)' }}>{profile.bio}</p>
            ) : isOwn ? (
              <div style={{ padding: '14px 16px', background: 'color-mix(in oklch, var(--accent) 8%, transparent)',
                border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)', borderRadius: 10,
                fontSize: 13, color: 'var(--accent)' }}>
                Add a bio so freelancers know who they're working with.{' '}
                <button onClick={() => setEditModal(true)} style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--accent)' }}>
                  Add now
                </button>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No bio provided.</p>
            )}
          </div>
          <div className="glass" style={{ padding: 20 }}>
            <div className="label" style={{ marginBottom: 14 }}>Details</div>
            <div className="col gap-3">
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="muted">Member since</span>
                <span style={{ fontWeight: 500 }}>{fmtMonth(profile.created_at)}</span>
              </div>
              {profile.trust_level && profile.trust_level !== 'new' && (
                <div className="row between" style={{ fontSize: 13 }}>
                  <span className="muted">Trust level</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{profile.trust_level}</span>
                </div>
              )}
              {profile.trust_score != null && (
                <div className="row between" style={{ fontSize: 13 }}>
                  <span className="muted">Trust score</span>
                  <span style={{ fontWeight: 600 }}>{profile.trust_score}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* edit profile modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit profile">
        <form onSubmit={handleSave}>
          <div className="col gap-4" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Full name</div>
              <input className="field" required value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Bio</div>
              <textarea className="field" rows={4} style={{ resize: 'none' }}
                placeholder="Tell clients about yourself…"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
            </div>
            {isFreelancer && (
              <>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Hourly rate ($)</div>
                  <input className="field" type="number" min="1" placeholder="e.g. 75"
                    value={form.hourly_rate}
                    onChange={(e) => setForm((p) => ({ ...p, hourly_rate: e.target.value }))} />
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>
                    Skills <span className="muted" style={{ fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span>
                  </div>
                  <input className="field" placeholder="React, Node.js, Figma"
                    value={form.skills}
                    onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))} />
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Portfolio URL</div>
                  <input className="field" placeholder="https://yoursite.com"
                    value={form.portfolio_url}
                    onChange={(e) => setForm((p) => ({ ...p, portfolio_url: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          <div style={{ paddingTop: 16 }}>
            <button type="submit" className="btn amber" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Profile;
