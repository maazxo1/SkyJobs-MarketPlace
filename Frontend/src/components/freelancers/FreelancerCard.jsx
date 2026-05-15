import { Link } from 'react-router-dom';
import { Stars } from '../common/StarRating';

const FreelancerCard = ({ freelancer }) => {
  const {
    id, name, bio, skills = [], hourly_rate, availability,
    jobs_completed = 0, avg_rating,
  } = freelancer;

  const topRole = skills[0] || 'Freelancer';
  const initial = name?.charAt(0).toUpperCase();

  return (
    <div className="bg-surface border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-4 hover:border-[var(--accent)] hover:shadow-sm transition-all duration-200 group">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-[#0F766E] flex items-center justify-center text-white font-bold font-display text-lg shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold font-display text-ink text-sm group-hover:text-accent transition-colors truncate">
                {name}
              </p>
              <p className="text-xs text-ink-3 truncate">{topRole}</p>
            </div>
            {hourly_rate && (
              <p className="text-sm font-bold font-display text-accent shrink-0 whitespace-nowrap">
                ${Number(hourly_rate).toLocaleString()}<span className="text-ink-3 font-normal text-xs">/hr</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${availability ? 'text-success' : 'text-ink-3'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${availability ? 'bg-[var(--success)]' : 'bg-[var(--ink-3)]'}`} />
              {availability ? 'Available' : 'Unavailable'}
            </span>
            {avg_rating && (
              <>
                <span className="text-ink-3 opacity-40 text-xs">·</span>
                <Stars rating={avg_rating} size="sm" />
                <span className="text-[11px] text-ink-3">{avg_rating}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-xs text-ink-3 leading-relaxed line-clamp-2">{bio}</p>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-accent-muted text-accent-deep border border-[var(--border)]"
            >
              {s}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-page text-ink-3 border border-[var(--border)]">
              +{skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-auto">
        <p className="text-[11px] text-ink-3">
          {jobs_completed > 0
            ? `${jobs_completed} job${jobs_completed !== 1 ? 's' : ''} completed`
            : 'New to SkyJobs'}
        </p>
        <Link
          to={`/profile/${id}`}
          className="text-xs font-semibold text-accent hover:text-accent-deep transition-colors"
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
};

export default FreelancerCard;
