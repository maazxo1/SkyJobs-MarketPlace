import { Link } from 'react-router-dom';

const parseSkills = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const JobCard = ({ job }) => {
  const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const expired  = daysLeft <= 0;
  const urgent   = !expired && daysLeft <= 4;
  const skills   = parseSkills(job.skills_required);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block px-6 py-5 hover:bg-page/60 transition-colors group"
    >
      <div className="flex items-start gap-4">

        {/* Left — main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="overline truncate max-w-[160px]">{job.category_name}</span>
            {job.location && (
              <>
                <span className="text-ink-3 text-xs opacity-50">·</span>
                <span className="text-[10px] font-medium text-ink-3 truncate">{job.location}</span>
              </>
            )}
          </div>

          <h3 className="font-display font-bold text-ink text-[0.925rem] leading-snug line-clamp-1 group-hover:text-accent transition-colors duration-150 mb-1">
            {job.title}
          </h3>

          <p className="text-xs text-ink-3 line-clamp-2 leading-relaxed mb-3">
            {job.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
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
        </div>

        {/* Right — budget + urgency */}
        <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
          <p className="text-sm font-bold font-display text-accent leading-none whitespace-nowrap">
            ${Number(job.budget_min).toLocaleString()}
            <span className="text-ink-3 font-normal text-xs"> – </span>
            ${Number(job.budget_max).toLocaleString()}
          </p>

          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            expired ? 'bg-page text-ink-3 border border-[var(--border)]' :
            urgent  ? 'bg-danger-muted text-danger' :
                      'bg-success-muted text-success-deep'
          }`}>
            {!expired && (
              <span className={`w-1 h-1 rounded-full shrink-0 ${urgent ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'}`} />
            )}
            {expired ? 'Expired' : `${daysLeft}d left`}
          </span>

          <p className="text-[11px] text-ink-3 whitespace-nowrap">
            {job.bid_count ?? 0} proposal{job.bid_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Client row */}
      <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-[var(--border)]">
        <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center text-white text-[9px] font-bold font-display shrink-0">
          {job.client_name?.charAt(0).toUpperCase()}
        </div>
        <span className="text-[11px] text-ink-2 truncate">{job.client_name}</span>
      </div>
    </Link>
  );
};

export default JobCard;
