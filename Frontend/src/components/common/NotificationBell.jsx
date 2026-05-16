import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markRead, markAllRead } from '../../api/notifications.api';
import { useSocket } from '../../context/SocketContext';
import Icon from './Icon';

const TYPE_COLOR = {
  bid_accepted: 'var(--success)',
  bid_rejected: 'var(--danger)',
  new_bid:      'var(--accent)',
};

const timeAgo = (date) => {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { on } = useSocket();
  const [open, setOpen]                 = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]             = useState(0);
  const dropRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data.notifications || []);
      setUnread(res.data.data.unreadCount || 0);
    } catch { /* not logged in */ }
  }, []);

  // Initial load + fallback poll every 60s (socket handles real-time)
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Real-time: new notification arrives via socket → prepend to list
  useEffect(() => {
    return on('notification:new', (notification) => {
      setNotifications((prev) => {
        // Avoid duplicates if poll fires right after socket push
        if (prev.find((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      setUnread((c) => c + 1);
    });
  }, [on]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkAll = async () => {
    await markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleClick = async (n) => {
    if (!n.read) {
      await markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      <button
        className="tb-icon"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" size={15} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--danger)',
            border: '2px solid var(--bg)',
          }} />
        )}
      </button>

      {open && (
        <div className="slide-up" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320, zIndex: 200,
          background: 'var(--bg-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          boxShadow: '0 20px 48px -8px oklch(0 0 0 / 0.5)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
        }}>
          {/* header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 0 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* list */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'color-mix(in oklch, var(--ink) 5%, transparent)',
                  border: '1px solid var(--border)',
                  display: 'grid', placeItems: 'center',
                  margin: '0 auto 10px',
                }}>
                  <Icon name="bell" size={18} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: n.read ? 'transparent' : 'color-mix(in oklch, var(--accent) 5%, transparent)',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in oklch, var(--ink) 4%, transparent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? 'transparent' : 'color-mix(in oklch, var(--accent) 5%, transparent)'; }}
                >
                  {/* type dot */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: `color-mix(in oklch, ${TYPE_COLOR[n.type] || 'var(--accent)'} 14%, transparent)`,
                    display: 'grid', placeItems: 'center',
                    color: TYPE_COLOR[n.type] || 'var(--accent)',
                  }}>
                    <Icon name={n.type === 'bid_accepted' ? 'check' : n.type === 'bid_rejected' ? 'x' : 'bell'} size={14} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, fontWeight: n.read ? 500 : 700,
                      color: n.read ? 'var(--ink-2)' : 'var(--ink)',
                      lineHeight: 1.35, marginBottom: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.title || 'Notification'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4, marginBottom: 4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--ink-4)' }}>{timeAgo(n.created_at)}</p>
                  </div>

                  {!n.read && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--accent)', flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
