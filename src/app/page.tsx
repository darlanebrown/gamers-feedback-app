'use client';

import { useState, useEffect, useCallback } from 'react';
import { Review, PLATFORMS } from '@/types';
import styles from './page.module.css';

// ── Rating display ─────────────────────────────────────────────────────────────
function RatingBar({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? 'var(--neon)' : rating >= 6 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className={styles.ratingBar}>
      <span className={styles.ratingNum} style={{ color }}>
        {rating}
        <span className={styles.ratingMax}>/10</span>
      </span>
      <div className={styles.ratingTrack}>
        <div
          className={styles.ratingFill}
          style={{ width: `${rating * 10}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Classification badge ───────────────────────────────────────────────────────
function ClassBadge({ classification }: { classification: string }) {
  const map: Record<string, { label: string; color: string }> = {
    helpful: { label: '✓ Verified Review', color: 'var(--neon)' },
    spam:    { label: '✗ Spam',            color: 'var(--red)' },
    toxic:   { label: '⚠ Toxic',          color: 'var(--yellow)' },
    pending: { label: '◌ Pending',         color: 'var(--text-muted)' },
  };
  const { label, color } = map[classification] || map.pending;
  return (
    <span className={styles.badge} style={{ color, borderColor: color }}>
      {label}
    </span>
  );
}

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewCard({ review, onClassify }: {
  review: Review;
  onClassify?: (id: string) => void;
}) {
  const borderColor =
    review.classification === 'helpful'
      ? 'var(--neon)'
      : review.classification === 'spam'
      ? 'var(--red)'
      : review.classification === 'toxic'
      ? 'var(--yellow)'
      : 'var(--border)';

  return (
    <article className={styles.card} style={{ '--border-color': borderColor } as React.CSSProperties}>
      <div className={styles.cardGlow} />
      <header className={styles.cardHeader}>
        <div>
          <h3 className={styles.gameTitle}>{review.gameTitle}</h3>
          <div className={styles.cardMeta}>
            <span className={styles.platform}>{review.platform}</span>
            <span className={styles.dot}>·</span>
            <span className={styles.playtime}>{review.playtime} played</span>
            <span className={styles.dot}>·</span>
            <span className={styles.reviewer}>{review.reviewerTag}</span>
          </div>
        </div>
        <div className={styles.cardRight}>
          <RatingBar rating={review.rating} />
          <ClassBadge classification={review.classification} />
        </div>
      </header>

      <h4 className={styles.headline}>"{review.headline}"</h4>
      <p className={styles.body}>{review.body}</p>

      {(review.pros || review.cons) && (
        <div className={styles.proscons}>
          {review.pros && (
            <div className={styles.pros}>
              <span className={styles.prosLabel}>+ Pros</span>
              <p>{review.pros}</p>
            </div>
          )}
          {review.cons && (
            <div className={styles.cons}>
              <span className={styles.consLabel}>− Cons</span>
              <p>{review.cons}</p>
            </div>
          )}
        </div>
      )}

      {review.classification === 'pending' && onClassify && (
        <button className={styles.classifyBtn} onClick={() => onClassify(review.id)}>
          Run AI Classification
        </button>
      )}

      {review.classificationReason && (
        <p className={styles.classReason}>AI: {review.classificationReason}</p>
      )}

      <time className={styles.timestamp}>
        {new Date(review.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </time>
    </article>
  );
}

// ── Submit review modal ────────────────────────────────────────────────────────
function SubmitModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    gameTitle: '', platform: '', rating: 7, headline: '',
    body: '', pros: '', cons: '', playtime: '', reviewerTag: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rating: Number(form.rating) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      const { review } = await res.json();

      // Automatically classify the new review
      await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: review.id,
          headline: form.headline,
          body: form.body,
          pros: form.pros,
          cons: form.cons,
          reviewerTag: form.reviewerTag,
        }),
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Write a Review</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Game Title *</label>
              <input
                className={styles.input}
                value={form.gameTitle}
                onChange={set('gameTitle')}
                placeholder="e.g. Elden Ring"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Platform *</label>
              <select className={styles.select} value={form.platform} onChange={set('platform')} required>
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Rating: <span style={{ color: 'var(--neon)', fontWeight: 700 }}>{form.rating}/10</span>
            </label>
            <input
              type="range" min={1} max={10} step={1}
              value={form.rating} onChange={set('rating')}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>1 — Terrible</span><span>5 — Mediocre</span><span>10 — Masterpiece</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Headline *</label>
            <input
              className={styles.input}
              value={form.headline}
              onChange={set('headline')}
              placeholder="Sum up your experience in one line"
              required
              maxLength={120}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Your Review *</label>
            <textarea
              className={styles.textarea}
              value={form.body}
              onChange={set('body')}
              placeholder="Tell other gamers what you actually think. Be specific."
              required
              rows={5}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Pros</label>
              <textarea
                className={styles.textarea}
                value={form.pros}
                onChange={set('pros')}
                placeholder="What did the game do well?"
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cons</label>
              <textarea
                className={styles.textarea}
                value={form.cons}
                onChange={set('cons')}
                placeholder="What could be better?"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Hours Played</label>
              <input
                className={styles.input}
                value={form.playtime}
                onChange={set('playtime')}
                placeholder="e.g. 120 hours"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Gamer Tag *</label>
              <input
                className={styles.input}
                value={form.reviewerTag}
                onChange={set('reviewerTag')}
                placeholder="YourTag#1234"
                required
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <span className={styles.spinner} />
            ) : (
              'Submit Review'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ total: 0, helpful: 0, spam: 0, toxic: 0, avgRating: '0', uniqueGames: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'helpful' | 'spam' | 'toxic'>('helpful');
  const [search, setSearch] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'helpful') params.set('filter', 'helpful');
      if (search) params.set('game', search);

      const [revRes, statsRes] = await Promise.all([
        fetch(`/api/reviews?${params}`),
        fetch('/api/stats'),
      ]);
      const { reviews: revData } = await revRes.json();
      const statsData = await statsRes.json();

      const filtered = filter === 'all'
        ? revData
        : revData.filter((r: Review) => r.classification === filter);

      setReviews(filtered);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleClassify = async (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) return;
    await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId,
        headline: review.headline,
        body: review.body,
        pros: review.pros,
        cons: review.cons,
        reviewerTag: review.reviewerTag,
      }),
    });
    fetchReviews();
  };

  return (
    <main className={styles.main}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>True Reviews · True Gamers</div>
          <h1 className={styles.heroTitle}>
            Gamers'<br />
            <span className={styles.accent}>Feedback</span>
          </h1>
          <p className={styles.heroSub}>
            No sponsored posts. No review bombs. No paid placements.<br />
            Just real opinions from players who actually played.
          </p>
          <button className={styles.heroBtn} onClick={() => setShowModal(true)}>
            Write a Review
          </button>
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          {[
            { label: 'Reviews', value: stats.total },
            { label: 'Verified', value: stats.helpful },
            { label: 'Games Covered', value: stats.uniqueGames },
            { label: 'Avg Rating', value: `${stats.avgRating}/10` },
            { label: 'Spam Caught', value: stats.spam + stats.toxic },
          ].map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filter bar ── */}
      <section className={styles.filterSection}>
        <div className={styles.filterBar}>
          <div className={styles.filterTabs}>
            {(['helpful', 'all', 'spam', 'toxic'] as const).map((f) => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'helpful' ? '✓ Verified' : f === 'all' ? 'All' : f === 'spam' ? '✗ Spam' : '⚠ Toxic'}
              </button>
            ))}
          </div>
          <input
            className={styles.searchInput}
            placeholder="Search by game title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* ── Reviews feed ── */}
      <section className={styles.feed}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🎮</p>
            <p className={styles.emptyText}>No reviews found.</p>
            <p className={styles.emptySubtext}>
              {search ? `No results for "${search}"` : 'Be the first to write one.'}
            </p>
            <button className={styles.heroBtn} onClick={() => setShowModal(true)}>
              Write the first review
            </button>
          </div>
        ) : (
          <div className={styles.reviewGrid}>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClassify={handleClassify}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Submit modal ── */}
      {showModal && (
        <SubmitModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchReviews(); }}
        />
      )}
    </main>
  );
}
