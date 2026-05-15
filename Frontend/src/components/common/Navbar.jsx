import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import Button from './Button';
import Modal from './Modal';
import NotificationBell from './NotificationBell';

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="4" />
    <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const Navbar = () => {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const toast = useToast();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setLogoutConfirm(false);
    await logoutUser();
    toast.success('Signed out successfully');
    setMobileOpen(false);
    navigate('/');
  };

  const linkCls = ({ isActive }) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors font-display ${
      isActive
        ? 'text-accent bg-accent-muted'
        : 'text-ink-2 hover:text-ink hover:bg-page'
    }`;

  const mobileLinkCls = ({ isActive }) =>
    `block px-4 py-3 rounded-xl text-sm font-semibold font-display transition-colors ${
      isActive
        ? 'text-accent bg-accent-muted'
        : 'text-ink hover:bg-page'
    }`;

  return (
    <>
      <nav className="sticky top-0 z-50 nav-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between" style={{ height: '3.75rem' }}>

            {/* Wordmark */}
            <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 8H10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-display font-bold text-base text-ink tracking-tight">SkyJobs</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-0.5">
              <NavLink to="/jobs" className={linkCls}>Browse Jobs</NavLink>
              <NavLink to="/freelancers" className={linkCls}>Find Talent</NavLink>
              {isAuthenticated && (
                <>
                  <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
                  <NavLink to={`/profile/${user?.id}`} className={linkCls}>Profile</NavLink>
                  {user?.role === 'admin' && (
                    <NavLink to="/admin" className={linkCls}>Admin</NavLink>
                  )}
                </>
              )}
            </div>

            {/* Desktop auth + dark toggle */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={toggle}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-2 hover:text-ink hover:bg-page transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>

              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-page border border-[var(--border)]">
                    <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold font-display leading-none">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-ink-2 capitalize font-display">{user?.role}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLogoutConfirm(true)}>Sign out</Button>
                </>
              ) : (
                <>
                  <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                  <Link to="/register"><Button size="sm">Get Started</Button></Link>
                </>
              )}
            </div>

            {/* Mobile: dark toggle + hamburger */}
            <div className="flex md:hidden items-center gap-1">
              <button
                onClick={toggle}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-page transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-2 hover:bg-page transition-colors"
                aria-label="Open menu"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-surface border-l border-[var(--border)] shadow-2xl md:hidden flex flex-col drawer ${mobileOpen ? 'open' : ''}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 11L7 3L12 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8H10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-sm text-ink">SkyJobs</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-2 hover:bg-page transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer nav links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink to="/jobs" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>Browse Jobs</NavLink>
          <NavLink to="/freelancers" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>Find Talent</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
              <NavLink to={`/profile/${user?.id}`} className={mobileLinkCls} onClick={() => setMobileOpen(false)}>Profile</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>Admin Panel</NavLink>
              )}
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div className="px-4 py-5 border-t border-[var(--border)]">
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-page border border-[var(--border)]">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold font-display">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold font-display text-ink truncate">{user?.name}</p>
                  <p className="text-xs text-ink-3 capitalize">{user?.role}</p>
                </div>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => setLogoutConfirm(true)}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full">Log in</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <Modal open={logoutConfirm} onClose={() => setLogoutConfirm(false)} title="Sign out of SkyJobs?">
        <p className="text-sm text-ink-2 mb-5 leading-relaxed">
          You&apos;ll be signed out of your account and returned to the homepage.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setLogoutConfirm(false)}>
            Stay signed in
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;
