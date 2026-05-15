import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import Avatar from '../common/Avatar';
import NotificationBell from '../common/NotificationBell';

const ROUTE_META = {
  '/':            { eyebrow: 'SkyJobs',    title: 'Home'                 },
  '/jobs':        { eyebrow: 'Briefs',     title: 'Browse work',          pulse: 'open briefs' },
  '/freelancers': { eyebrow: 'Talent',     title: 'Find talent',          pulse: 'available'   },
  '/dashboard':   { eyebrow: 'Dashboard',  title: 'Overview'              },
  '/orders':      { eyebrow: 'Orders',     title: 'My orders'             },
  '/admin':       { eyebrow: 'Admin',      title: 'Control room',         pulse: 'live'        },
  '/login':       { eyebrow: 'Auth',       title: 'Sign in'               },
  '/register':    { eyebrow: 'Auth',       title: 'Get started'           },
};

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logoutUser } = useAuth();
  const toast = useToast();
  const [searchFocus, setSearchFocus] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const pathname = location.pathname;
  let meta = ROUTE_META[pathname];
  if (!meta && pathname.startsWith('/jobs/'))      meta = { eyebrow: 'Briefs',   title: 'Brief detail'    };
  if (!meta && pathname.startsWith('/profile/'))   meta = { eyebrow: 'Profile',  title: 'Member profile'  };
  if (!meta && pathname.startsWith('/orders/'))    meta = { eyebrow: 'Orders',   title: 'Order details'   };
  if (!meta && pathname.startsWith('/disputes/'))  meta = { eyebrow: 'Disputes', title: 'Dispute'         };
  if (!meta) meta = { eyebrow: 'SkyJobs', title: 'Page' };

  // close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logoutUser();
    toast.success('Signed out. See you soon.');
    navigate('/');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/jobs?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchFocus(false);
    }
  };

  const isClient     = user?.role === 'client';
  const isFreelancer = user?.role === 'freelancer';

  const primaryAction = isAuthenticated
    ? isClient
      ? { label: 'Post a brief', icon: 'plus',      onClick: () => { navigate('/dashboard'); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-job')), 80); } }
      : isFreelancer
        ? { label: 'Find work',  icon: 'briefcase', onClick: () => navigate('/jobs') }
        : { label: 'Admin',      icon: 'shield',    onClick: () => navigate('/admin') }
    : { label: 'Get started', icon: 'plus', onClick: () => navigate('/register') };

  const menuItems = [
    { icon: 'grid',  label: 'Dashboard',  path: '/dashboard' },
    { icon: 'user',  label: 'My profile', path: `/profile/${user?.id}` },
    ...(user?.role === 'admin' ? [{ icon: 'shield', label: 'Admin panel', path: '/admin' }] : []),
  ];

  return (
    <header className="topbar">
      {/* left: page context */}
      <div className="tb-context">
        <div className="tb-eyebrow">{meta.eyebrow}</div>
        <div className="tb-title">
          <span>{meta.title}</span>
          {meta.pulse && (
            <span className="tb-pulse">
              <span className="tb-pulse-dot" />
              {meta.pulse}
            </span>
          )}
        </div>
      </div>

      {/* center: search */}
      <div className={`tb-search ${searchFocus ? 'focus' : ''}`}>
        <Icon name="search" size={14} />
        <input
          placeholder="Search briefs, talent…  ↵ Enter"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleSearch}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
        />
        {searchVal
          ? <button style={{ width: 18, height: 18, borderRadius: '50%', background: 'color-mix(in oklch, var(--ink) 14%, transparent)', color: 'var(--ink-2)', fontSize: 14, display: 'grid', placeItems: 'center' }} onClick={() => setSearchVal('')}>×</button>
          : <kbd>⌘K</kbd>
        }
      </div>

      {/* right cluster */}
      <div className="tb-right">
        <button className="tb-primary" onClick={primaryAction.onClick}>
          <Icon name={primaryAction.icon} size={13} stroke={2.5} />
          <span>{primaryAction.label}</span>
        </button>

        <div className="tb-divider" />

        {isAuthenticated ? (
          <>
            <NotificationBell />

            {/* user dropdown */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="tb-me"
                onClick={() => setMenuOpen((p) => !p)}
                title="Account menu"
              >
                <span className="tb-me-avatar">
                  <Avatar name={user?.name} size={28} square />
                  <span className="tb-me-status" />
                </span>
                <span className="tb-me-text">
                  <span className="tb-me-name">{user?.name?.split(' ')[0]}</span>
                  <span className="tb-me-role">{user?.role}</span>
                </span>
                <span className="tb-me-chevron" style={{ display: 'inline-flex', color: 'var(--ink-3)', transform: menuOpen ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }}>
                  <Icon name="chevron-right" size={10} />
                </span>
              </button>

              {menuOpen && (
                <div className="tb-dropdown">
                  {/* user info header */}
                  <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={user?.name} size={36} square />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{user?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                          {user?.role} account
                        </div>
                      </div>
                    </div>
                  </div>

                  {menuItems.map((item) => (
                    <button
                      key={item.path}
                      className="tb-dropdown-item"
                      onClick={() => { navigate(item.path); setMenuOpen(false); }}
                    >
                      <Icon name={item.icon} size={14} />
                      {item.label}
                    </button>
                  ))}

                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />

                  <button className="tb-dropdown-item danger" onClick={handleLogout}>
                    <Icon name="logout" size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="btn ghost sm" onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn amber sm" onClick={() => navigate('/register')}>Register free</button>
          </>
        )}
      </div>
    </header>
  );
};

export default TopBar;
