'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './notifications.module.css';
import NotificationBell from '@/app/components/NotificationBell';

type Notif = {
  id: string;
  type: string;
  actorTag: string | null;
  reviewId: string | null;
  gameTitle: string | null;
  read: boolean;
  createdAt: string;
};

const LIMIT = 20;

function notifLink(n: Notif): string {
  if (n.type === 'follow' && n.actorTag)  return `/profile/${encodeURIComponent(n.actorTag)}`;
  if (n.reviewId)                          return `/reviews/${n.reviewId}`;
  if (n.gameTitle)                         return `/games/${encodeURIComponent(n.gameTitle)}`;
  return '/';
}

function notifText(n: Notif): string {
  if (n.type === 'follow')     return `${n.actorTag} started following you`;
  if (n.type === 'vote_up')    return `${n.actorTag} liked your review of ${n.gameTitle}`;
  if (n.type === 'vote_down')  return `${n.actorTag} disliked your review of ${n.gameTitle}`;
  if (n.type === 'reclassify') return `Your review of ${n.gameTitle} was reclassified`;
  return 'New notification';
}

export default function NotificationsPage() {
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loggedIn, setLoggedIn]       = useState<boolean | null>(null);

  const fetchPage = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/notifications?page=${p}&limit=${LIMIT}`)
      .then((r) => {
        if (r.status === 401) { setLoggedIn(false); return null; }
        setLoggedIn(true);
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setNotifs(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const goTo = (p: number) => {
    setPage(p);
    fetchPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (loggedIn === false) {
    return (
      <main className={styles.page}>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>← Reviews</a>
        </nav>
        <div className={styles.empty}>Sign in to view your notifications.</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <a href="/" className={styles.navLink}>← Reviews</a>
        <NotificationBell />
      </nav>

      <header className={styles.header}>
        <p className={styles.eyebrow}>Activity</p>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Notifications</h1>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>
        {!loading && (
          <p className={styles.subtitle}>
            {total} total · {unreadCount} unread
          </p>
        )}
      </header>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : notifs.length === 0 ? (
        <div className={styles.empty}>No notifications yet.</div>
      ) : (
        <>
          <ul className={styles.list}>
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`${styles.item} ${n.read ? styles.itemRead : ''}`}
              >
                <a
                  href={notifLink(n)}
                  className={styles.itemLink}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                >
                  <span className={styles.itemText}>{notifText(n)}</span>
                  <time className={styles.itemTime}>
                    {new Date(n.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </time>
                </a>
                {!n.read && <span className={styles.dot} />}
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => goTo(page - 1)}
                disabled={page <= 1}
              >
                ← Prev
              </button>
              <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => goTo(page + 1)}
                disabled={page >= totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
