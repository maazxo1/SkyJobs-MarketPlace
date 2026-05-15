const variants = {
  primary:   'bg-accent text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]',
  secondary: 'bg-surface border border-[var(--border-2)] text-ink hover:bg-page active:scale-[0.98]',
  danger:    'bg-[var(--danger)] text-white hover:bg-red-700 active:scale-[0.98]',
  ghost:     'text-ink-2 hover:text-ink hover:bg-page',
  outline:   'border border-[var(--accent)] text-accent hover:bg-accent-muted active:scale-[0.98]',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

const Button = ({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold font-display transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading && (
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )}
    {children}
  </button>
);

export default Button;
