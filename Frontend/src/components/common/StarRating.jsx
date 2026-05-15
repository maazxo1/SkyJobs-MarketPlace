let _starId = 0;
const Star = ({ filled, half, onClick, onHover, size = 'md' }) => {
  const uid = `half-${++_starId}`;
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <svg
      className={`${sz} ${onClick ? 'cursor-pointer' : ''} transition-colors`}
      viewBox="0 0 24 24"
      fill={filled || half ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      {half ? (
        <>
          <defs>
            <linearGradient id={uid}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            fill={`url(#${uid})`}
          />
        </>
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
        />
      )}
    </svg>
  );
};

// Display-only (read) star row
export const Stars = ({ rating, size = 'md', showNumber = false }) => {
  const r = Number(rating) || 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(r) ? 'var(--accent)' : 'var(--border-strong)' }}>
          <Star filled={i <= r} size={size} />
        </span>
      ))}
      {showNumber && (
        <span className="ml-1 text-xs font-semibold text-ink-2">{r.toFixed(1)}</span>
      )}
    </span>
  );
};

// Interactive (input) star row
const StarRating = ({ value, onChange, size = 'md' }) => {
  const handleClick = (i) => onChange(i);

  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ color: i <= value ? 'var(--accent)' : 'var(--border-strong)' }}
        >
          <Star filled={i <= value} onClick={() => handleClick(i)} size={size} />
        </span>
      ))}
    </span>
  );
};

export default StarRating;
