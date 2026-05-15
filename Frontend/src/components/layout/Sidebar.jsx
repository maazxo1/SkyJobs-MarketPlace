import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../common/Icon';

const CLIENT_ITEMS = [
  { path: '/',            icon: 'compass',   label: 'Home' },
  { path: '/jobs',        icon: 'briefcase', label: 'Browse briefs' },
  { path: '/freelancers', icon: 'users',     label: 'Find talent' },
  { path: '/orders',      icon: 'clipboard', label: 'My orders' },
  { path: '/dashboard',   icon: 'grid',      label: 'Dashboard' },
];

const FREELANCER_ITEMS = [
  { path: '/',            icon: 'compass',   label: 'Home' },
  { path: '/jobs',        icon: 'briefcase', label: 'Browse work' },
  { path: '/orders',      icon: 'clipboard', label: 'My orders' },
  { path: '/dashboard',   icon: 'chart',     label: 'Dashboard' },
];

const ADMIN_ITEMS = [
  { path: '/',          icon: 'compass',   label: 'Home' },
  { path: '/dashboard', icon: 'grid',      label: 'Overview' },
  { path: '/admin',     icon: 'shield',    label: 'Admin panel' },
  { path: '/jobs',      icon: 'briefcase', label: 'All briefs' },
  { path: '/freelancers', icon: 'users',   label: 'Users' },
];

const PUBLIC_ITEMS = [
  { path: '/',            icon: 'compass',   label: 'Home' },
  { path: '/jobs',        icon: 'briefcase', label: 'Browse work' },
  { path: '/freelancers', icon: 'users',     label: 'Talent' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { dark, toggle } = useTheme();

  let items = PUBLIC_ITEMS;
  if (isAuthenticated) {
    if (user?.role === 'client')     items = [...CLIENT_ITEMS,     { path: `/profile/${user.id}`, icon: 'user', label: 'My profile' }];
    else if (user?.role === 'freelancer') items = [...FREELANCER_ITEMS, { path: `/profile/${user.id}`, icon: 'user', label: 'My profile' }];
    else if (user?.role === 'admin') items = [...ADMIN_ITEMS,      { path: `/profile/${user.id}`, icon: 'user', label: 'My profile' }];
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // role accent for the logo area
  const roleColor = user?.role === 'client' ? 'var(--success)' : user?.role === 'admin' ? 'var(--danger)' : 'var(--accent)';

  return (
    <aside className="sidebar">
      <button className="logo" title="SkyJobs home" onClick={() => navigate('/')}>
        <i>S</i>
      </button>

      <div className="nav">
        {items.map((it) => (
          <button
            key={it.path + it.label}
            className={`nav-item ${isActive(it.path) ? 'active' : ''}`}
            title={it.label}
            aria-label={it.label}
            onClick={() => navigate(it.path)}
          >
            <Icon name={it.icon} size={18} />
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </div>

      <div className="foot">
        <button
          className="nav-item"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggle}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={18} />
          <span className="nav-label">{dark ? 'Light' : 'Dark'}</span>
        </button>
        <button
          className="nav-item"
          title={isAuthenticated ? 'Profile & settings' : 'Sign in'}
          aria-label={isAuthenticated ? 'Profile & settings' : 'Sign in'}
          onClick={() => navigate(isAuthenticated ? `/profile/${user?.id}` : '/login')}
        >
          <Icon name="settings" size={18} />
          <span className="nav-label">{isAuthenticated ? 'Settings' : 'Sign in'}</span>
        </button>

        {/* role indicator dot — hidden on mobile (redundant with bottom bar) */}
        {isAuthenticated && (
          <div title={`Signed in as ${user?.role}`} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: roleColor,
            margin: '4px auto 0',
            boxShadow: `0 0 0 3px color-mix(in oklch, ${roleColor} 20%, transparent)`,
          }} className="desktop-only" />
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
