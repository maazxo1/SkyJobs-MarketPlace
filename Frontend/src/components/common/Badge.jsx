const variants = {
  pending:     { cls: 'bg-warning-muted  text-warning      border border-[var(--border)]', dot: 'bg-[var(--warning)]' },
  accepted:    { cls: 'bg-success-muted  text-success-deep  border border-[var(--border)]', dot: 'bg-[var(--success)]' },
  rejected:    { cls: 'bg-danger-muted   text-danger        border border-[var(--border)]', dot: 'bg-[var(--danger)]' },
  withdrawn:   { cls: 'bg-page           text-ink-2         border border-[var(--border)]', dot: 'bg-[var(--ink-3)]' },
  open:        { cls: 'bg-accent-muted   text-accent        border border-[var(--border)]', dot: 'bg-[var(--accent)]' },
  in_review:   { cls: 'bg-warning-muted  text-warning       border border-[var(--border)]', dot: 'bg-[var(--warning)]' },
  closed:      { cls: 'bg-page           text-ink-2         border border-[var(--border)]', dot: 'bg-[var(--ink-3)]' },
  cancelled:   { cls: 'bg-danger-muted   text-danger        border border-[var(--border)]', dot: 'bg-[var(--danger)]' },
  active:      { cls: 'bg-success-muted  text-success-deep  border border-[var(--border)]', dot: 'bg-[var(--success)]' },
  in_progress: { cls: 'bg-accent-muted   text-accent        border border-[var(--border)]', dot: 'bg-[var(--accent)]' },
  completed:   { cls: 'bg-purple-muted   text-purple        border border-[var(--border)]', dot: 'bg-[var(--purple)]' },
  admin:       { cls: 'bg-danger-muted   text-danger        border border-[var(--border)]', dot: 'bg-[var(--danger)]' },
  client:      { cls: 'bg-purple-muted   text-purple        border border-[var(--border)]', dot: 'bg-[var(--purple)]' },
  freelancer:  { cls: 'bg-accent-muted   text-accent        border border-[var(--border)]', dot: 'bg-[var(--accent)]' },
};

const fallback = { cls: 'bg-page text-ink-2 border border-[var(--border)]', dot: 'bg-[var(--ink-3)]' };

const Badge = ({ status, role, className = '' }) => {
  const key = status ?? role;
  const v = variants[key] || fallback;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${v.cls} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v.dot}`} />
      {key?.replace(/_/g, ' ')}
    </span>
  );
};

export default Badge;
