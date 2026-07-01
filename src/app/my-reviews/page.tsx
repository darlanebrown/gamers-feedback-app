'use client';

import { useState, useEffect } from 'react';
import { Review } from '@/types';
import styles from './my-reviews.module.css';
import NotificationBell from '@/app/components/NotificationBell';

const CLASS_COLOR: Record<string, string> = {
  helpful: 'var(--neon)',
  spam:    'var(--red)',
  toxic:   'var(--yellow)',
  pending: 'var(--text-dim)',
};
const CLASS_LABEL: Record<string, string> = {
  helpful: '✓ Verified',
  spam:    '✗ Spam',
  toxic:   '⚠ Toxic',
  pending: '⏳ Pending',
};

type EditState = { headline: string; body: string; pros: string; cons: string; rating: number; playtime: string };

function ReviewCard({
  review,
  onDeleted,
  onUpdated,
}: {
  review: Review;
  onDeleted: (id: string) => void;
  onUpdated: (updated: Review) => void;
}) {
  const [mode, setMode]     = useState<'idle' | 'editing' | 'confirming'>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState<EditState>({
    headline: review.headline,
    body:     review.body,
    pros:     review.pros ?? '',
    cons:     review.cons ?? '',
    rating:   review.rating,
    playtime: review.playtime ?? '',
  });

  const set = (k: keyof EditState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await fetch(`/api/reviews/${review.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...form, rating: Number(form.rating) }),
    });
    setSaving(false);
    if (!res.ok) { setError('Could not save. Try again.'); return; }
    const { review: updated } = await res.json();
    onUpdated(updated);
    setMode('idle');
  };

  const handleDelete = async () => {
    setSaving(true); setError('');
    const res = await fetch(`/api/reviews/${review.id}`, { method: 'DELETE' });
    setSaving(false);
    if (!res.ok) { setError('Could not delete. Try again.'); return; }
    onDeleted(review.id);
  };

  const ratingColor =
    review.rating >= 8 ? 'var(--neon)' : review.rating >= 5 ? 'var(--yellow)' : 'var(--red)';

  return (
    <article className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.cardTop}>
        <div>
          <a href={`/games/${encodeURIComponent(review.gameTitle)}`} className={styles.gameTitle}>
            {review.gameTitle}
          </a>
          <p className={styles.cardMeta}>{review.platform} · {review.playtime}</p>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.rating} style={{ color: ratingColor }}>
            {review.rating}<span className={styles.ratingDenom}>/10</span>
          </span>
          <span
            className={styles.classBadge}
            style={{ color: CLASS_COLOR[review.classification] ?? 'var(--text-dim)', borderColor: CLASS_COLOR[review.classification] ?? 'var(--text-dim)' }}
          >
            {CLASS_LABEL[review.classification] ?? review.classification}
          </span>
        </div>
      </div>

      {/* ── Content / Edit form ── */}
      {mode === 'editing' ? (
        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.editRow}>
            <label className={styles.editLabel}>Headline</label>
            <input className={styles.editInput} value={form.headline} onChange={set('headline')} required maxLength={120} />
          </div>
          <div className={styles.editRow}>
            <label className={styles.editLabel}>Rating: <strong style={{ color: 'var(--neon)' }}>{form.rating}/10</strong></label>
            <input type="range" min={1} max={10} step={1} value={form.rating}
              onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
              className={styles.editSlider} />
          </div>
          <div className={styles.editRow}>
            <label className={styles.editLabel}>Review</label>
            <textarea className={styles.editTextarea} value={form.body} onChange={set('body')} required rows={4} />
          </div>
          <div className={styles.editCols}>
            <div className={styles.editRow}>
              <label className={styles.editLabel}>Pros</label>
              <textarea className={styles.editTextarea} value={form.pros} onChange={set('pros')} rows={2} />
            </div>
            <div className={styles.editRow}>
              <label className={styles.editLabel}>Cons</label>
              <textarea className={styles.editTextarea} value={form.cons} onChange={set('cons')} rows={2} />
            </div>
          </div>
          <div className={styles.editRow}>
            <label className={styles.editLabel}>Hours played</label>
            <input className={styles.editInput} value={form.playtime} onChange={set('playtime')} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.editActions}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </form>
      ) : mode === 'confirming' ? (
        <div className={styles.deleteConfirm}>
          <p className={styles.deleteWarning}>Delete this review permanently?</p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.editActions}>
            <button className={styles.deleteBtn} onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Yes, delete'}</button>
            <button className={styles.cancelBtn} onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <a href={`/reviews/${review.id}`} className={styles.headline}>"{review.headline}"</a>
          <p className={styles.body}>{review.body}</p>
          <div className={styles.footer}>
            <time className={styles.time}>
              {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
            <div className={styles.actions}>
              <button className={styles.editBtn} onClick={() => setMode('editing')}>Edit</button>
              <button className={styles.deleteBtn} onClick={() => setMode('confirming')}>Delete</button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [filter, setFilter]   = useState<'all' | 'helpful' | 'spam' | 'toxic' | 'pending'>('all');

  useEffect(() => {
    fetch('/api/reviews/mine')
      .then((r) => {
        if (r.status === 401) { setLoggedIn(false); return null; }
        setLoggedIn(true);
        return r.json();
      })
      .then((d) => { if (d) setReviews(d.reviews ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const handleDeleted = (id: string) => setReviews((prev) => prev.filter((r) => r.id !== id));
  const handleUpdated = (updated: Review) =>
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

  const displayed = filter === 'all' ? reviews : reviews.filter((r) => r.classification === filter);

  if (loggedIn === false) {
    return (
      <main className={styles.page}>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>← Reviews</a>
        </nav>
        <div className={styles.empty}>Sign in to manage your reviews.</div>
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
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.title}>My Reviews</h1>
        {!loading && <p className={styles.subtitle}>{reviews.length} total reviews</p>}
      </header>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven't written any reviews yet.</p>
          <a href="/games" className={styles.cta}>Browse games to review →</a>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className={styles.filterRow}>
            {(['all', 'helpful', 'spam', 'toxic', 'pending'] as const).map((f) => {
              const count = f === 'all' ? reviews.length : reviews.filter((r) => r.classification === f).length;
              if (f !== 'all' && count === 0) return null;
              return (
                <button
                  key={f}
                  className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : CLASS_LABEL[f]}
                  <span className={styles.filterCount}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.list}>
            {displayed.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
