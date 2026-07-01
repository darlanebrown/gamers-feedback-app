'use client';

import { useState, useEffect, useCallback } from 'react';
import { Review } from '@/types';
import styles from './admin.module.css';

type AdminUser = {
  id: string; email: string; gamerTag: string;
  role: string; banned: boolean; createdAt: string;
};

type Alert = { gameTitle: string; negativeCount: number; isBombing: boolean };

type Stats = { total: number; helpful: number; spam: number; toxic: number; pending: number; users: number };

const CLASS_COLORS: Record<string, string> = {
  helpful: 'var(--neon)', spam: 'var(--red)', toxic: 'var(--yellow)', pending: 'var(--text-dim)',
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'reviews' | 'users' | 'alerts'>('reviews');

  const [reviews, setReviews]   = useState<Review[]>([]);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [filter, setFilter]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [feedback, setFeedback] = useState('');

  // Verify admin session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setAuthorized(d?.user?.role === 'admin'))
      .catch(() => setAuthorized(false));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [revRes, userRes, alertRes, statsRes] = await Promise.all([
      fetch('/api/admin/reviews'),
      fetch('/api/admin/users'),
      fetch('/api/admin/alerts'),
      fetch('/api/stats'),
    ]);
    if (revRes.ok)   setReviews((await revRes.json()).reviews);
    if (userRes.ok)  setUsers((await userRes.json()).users);
    if (alertRes.ok) setAlerts((await alertRes.json()).alerts);
    if (statsRes.ok) {
      const s = await statsRes.json();
      const pending = (await revRes.json().catch(() => ({ reviews: [] }))).reviews?.filter((r: Review) => r.classification === 'pending').length ?? 0;
      setStats({ ...s, pending, users: (await userRes.json().catch(() => ({ total: 0 }))).total ?? 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (authorized) loadAll(); }, [authorized, loadAll]);

  const flash = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); };

  const overrideClassification = async (id: string, classification: string) => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classification, reason: 'Admin override' }),
    });
    if (res.ok) { flash(`✓ Set to ${classification}`); loadAll(); }
    else flash('Failed to update.');
  };

  const userAction = async (id: string, action: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) { flash(`✓ User ${action}ned`); loadAll(); }
    else flash('Failed to update user.');
  };

  if (authorized === null) return <div className={styles.center}><div className={styles.spinner} /></div>;
  if (!authorized) return (
    <div className={styles.center}>
      <h2 className={styles.denied}>Access Denied</h2>
      <p style={{ color: 'var(--text-muted)' }}>You need admin privileges to view this page.</p>
      <a href="/" className={styles.homeLink}>← Back to reviews</a>
    </div>
  );

  const displayed = filter
    ? reviews.filter((r) => r.classification === filter)
    : reviews;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <a href="/" className={styles.back}>← Back to site</a>
        </div>
        {feedback && <div className={styles.feedback}>{feedback}</div>}
      </header>

      {/* Stats bar */}
      {stats && (
        <div className={styles.statsBar}>
          {[
            { label: 'Total Reviews', value: stats.total, color: 'var(--text)' },
            { label: 'Verified',      value: stats.helpful, color: 'var(--neon)' },
            { label: 'Spam',          value: stats.spam,    color: 'var(--red)' },
            { label: 'Toxic',         value: stats.toxic,   color: 'var(--yellow)' },
            { label: 'Pending',       value: stats.pending ?? 0, color: 'var(--text-dim)' },
            { label: 'Users',         value: users.length,  color: 'var(--text)' },
            { label: 'Bomb Alerts',   value: alerts.length, color: alerts.length > 0 ? 'var(--red)' : 'var(--text-dim)' },
          ].map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['reviews', 'users', 'alerts'] as const).map((t) => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t === 'reviews' ? `Reviews (${reviews.length})` : t === 'users' ? `Users (${users.length})` : `Bomb Alerts ${alerts.length > 0 ? `(${alerts.length} 🚨)` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.center}><div className={styles.spinner} /></div>
      ) : (
        <>
          {/* ── Reviews tab ── */}
          {tab === 'reviews' && (
            <div>
              <div className={styles.filterRow}>
                {['', 'helpful', 'spam', 'toxic', 'pending'].map((f) => (
                  <button key={f || 'all'} className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`} onClick={() => setFilter(f)}>
                    {f || 'All'} ({f ? reviews.filter(r => r.classification === f).length : reviews.length})
                  </button>
                ))}
              </div>
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>Game</span><span>Reviewer</span><span>Rating</span><span>Classification</span><span>Override</span>
                </div>
                {displayed.map((r) => (
                  <div key={r.id} className={styles.tableRow}>
                    <span className={styles.gameCell}>{r.gameTitle}</span>
                    <span className={styles.tagCell}><a href={`/profile/${encodeURIComponent(r.reviewerTag)}`} className={styles.tagLink}>{r.reviewerTag}</a></span>
                    <span style={{ color: r.rating >= 8 ? 'var(--neon)' : r.rating >= 5 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>{r.rating}/10</span>
                    <span style={{ color: CLASS_COLORS[r.classification] ?? 'var(--text-dim)', fontSize: 12, fontWeight: 600 }}>{r.classification}</span>
                    <span className={styles.actions}>
                      {(['helpful', 'spam', 'toxic', 'pending'] as const).filter(c => c !== r.classification).map((c) => (
                        <button key={c} className={styles.actionBtn} style={{ borderColor: CLASS_COLORS[c], color: CLASS_COLORS[c] }} onClick={() => overrideClassification(r.id, c)}>
                          {c}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Users tab ── */}
          {tab === 'users' && (
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Gamer Tag</span><span>Email</span><span>Role</span><span>Status</span><span>Actions</span>
              </div>
              {users.map((u) => (
                <div key={u.id} className={styles.tableRow}>
                  <span><a href={`/profile/${encodeURIComponent(u.gamerTag)}`} className={styles.tagLink}>{u.gamerTag}</a></span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</span>
                  <span style={{ color: u.role === 'admin' ? 'var(--neon)' : 'var(--text-dim)', fontSize: 12, fontWeight: 700 }}>{u.role}</span>
                  <span style={{ color: u.banned ? 'var(--red)' : 'var(--neon)', fontSize: 12 }}>{u.banned ? 'Banned' : 'Active'}</span>
                  <span className={styles.actions}>
                    {!u.banned
                      ? <button className={styles.actionBtn} style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => userAction(u.id, 'ban')}>Ban</button>
                      : <button className={styles.actionBtn} style={{ borderColor: 'var(--neon)', color: 'var(--neon)' }} onClick={() => userAction(u.id, 'unban')}>Unban</button>
                    }
                    {u.role !== 'admin' && (
                      <button className={styles.actionBtn} style={{ borderColor: 'var(--neon)', color: 'var(--neon)' }} onClick={() => userAction(u.id, 'promote')}>Promote</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Alerts tab ── */}
          {tab === 'alerts' && (
            <div>
              {alerts.length === 0 ? (
                <p className={styles.empty}>No review bombing detected right now.</p>
              ) : (
                <div className={styles.alertList}>
                  {alerts.map((a) => (
                    <div key={a.gameTitle} className={styles.alertCard}>
                      <span className={styles.alertIcon}>🚨</span>
                      <div>
                        <p className={styles.alertGame}>{a.gameTitle}</p>
                        <p className={styles.alertMeta}>{a.negativeCount} negative reviews in the last 2 hours</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
