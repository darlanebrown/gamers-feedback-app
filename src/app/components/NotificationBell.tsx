'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './NotificationBell.module.css';

type Notif = {
  id: string;
  type: string;
  actorTag: string | null;
  gameTitle: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [loggedIn, setLoggedIn]       = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = () => {
    fetch('/api/notifications/count')
      .then((r) => {
        if (r.status === 401) { setLoggedIn(false); return null; }
        setLoggedIn(true);
        return r.json();
      })
      .then((d) => { if (d) setUnreadCount(d.unreadCount); })
      .catch(() => {});
  };

  const fetchAll = () => {
    fetch('/api/notifications')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setNotifs(d.notifications);
          setUnreadCount(d.unreadCount);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) fetchAll();
    setOpen((o) => !o);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
    setUnreadCount(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!loggedIn) return null;

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        className={styles.bellBtn}
        onClick={handleToggle}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markReadBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifs.length === 0 ? (
            <p className={styles.empty}>No notifications yet.</p>
          ) : (
            notifs.map((n) => (
              <div key={n.id} className={`${styles.item} ${n.read ? styles.itemRead : ''}`}>
                <span className={styles.text}>
                  {n.type === 'follow'      && `${n.actorTag} started following you`}
                  {n.type === 'vote_up'     && `${n.actorTag} liked your review of ${n.gameTitle}`}
                  {n.type === 'vote_down'   && `${n.actorTag} disliked your review of ${n.gameTitle}`}
                  {n.type === 'reclassify'  && `Your review of ${n.gameTitle} was reclassified`}
                </span>
                {!n.read && <span className={styles.dot} />}
              </div>
            ))
          )}

          <a href="/notifications" className={styles.viewAll}>
            View all notifications →
          </a>
        </div>
      )}
    </div>
  );
}
