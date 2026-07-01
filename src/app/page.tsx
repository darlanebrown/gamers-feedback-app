'use client';

import { useState, useEffect, useCallback } from 'react';
import { Review, PLATFORMS } from '@/types';
import styles from './page.module.css';

type AnalyticsData = {
  gameTitle: string;
  totalReviews: number;
  helpfulCount: number;
  spamCount: number;
  toxicCount: number;
  avgRating: number;
  platformBreakdown: { platform: string; count: number }[];
  topPros: string[];
  topCons: string[];
};

type Recommendation = {
  gameTitle: string;
  avgRating: number;
  reviewCount: number;
};

type SessionUser = { id: string; email: string; gamerTag: string; role?: string };

type GameMeta = {
  slug: string; title: string; coverUrl: string | null; genres: string | null;
  releaseDate: string | null; developer: string | null; metacritic: number | null;
  description: string | null;
};

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', gamerTag: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, gamerTag: form.gamerTag };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 420 }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--black)', padding: 4, borderRadius: 6, border: '1px solid var(--border)' }}>
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                background: mode === m ? 'var(--neon)' : 'transparent',
                color: mode === m ? 'var(--black)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>Gamer Tag</label>
              <input className={styles.input} value={form.gamerTag} onChange={set('gamerTag')} placeholder="YourTag#1234" required minLength={2} maxLength={50} />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>Password {mode === 'register' && <span style={{ fontWeight: 400, textTransform: 'none' }}>(min 8 chars)</span>}</label>
            <input className={styles.input} type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={mode === 'register' ? 8 : 1} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

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

// ── Game Analytics Modal ───────────────────────────────────────────────────────
function GameAnalyticsModal({ gameTitle, onClose }: {
  gameTitle: string;
  onClose: () => void;
}) {
  const [data, setData]         = useState<AnalyticsData | null>(null);
  const [gameMeta, setGameMeta] = useState<GameMeta | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const enc = encodeURIComponent(gameTitle);
    Promise.all([
      fetch(`/api/games/${enc}/analytics`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/games/${enc}`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([analyticsRes, gameMeta]) => {
      setData(analyticsRes?.analytics ?? null);
      setGameMeta(gameMeta?.game ?? null);
      setLoading(false);
    });
  }, [gameTitle]);

  const ratingColor = data
    ? data.avgRating >= 8 ? 'var(--neon)' : data.avgRating >= 5 ? 'var(--yellow)' : 'var(--red)'
    : 'var(--text-dim)';

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {gameTitle}
            <span className={styles.analyticsBadge}>Analytics</span>
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Game metadata banner */}
        {gameMeta && (
          <div className={styles.gameMetaBanner}>
            {gameMeta.coverUrl && (
              <img
                src={gameMeta.coverUrl}
                alt={gameMeta.title}
                className={styles.gameCover}
              />
            )}
            <div className={styles.gameMetaInfo}>
              {gameMeta.genres && (
                <div className={styles.genreTags}>
                  {gameMeta.genres.split(', ').map((g) => (
                    <span key={g} className={styles.genreTag}>{g}</span>
                  ))}
                </div>
              )}
              <div className={styles.gameMetaRow}>
                {gameMeta.releaseDate && (
                  <span className={styles.gameMetaItem}>
                    <span className={styles.gameMetaLabel}>Released</span>
                    {gameMeta.releaseDate}
                  </span>
                )}
                {gameMeta.developer && (
                  <span className={styles.gameMetaItem}>
                    <span className={styles.gameMetaLabel}>Developer</span>
                    {gameMeta.developer}
                  </span>
                )}
                {gameMeta.metacritic !== null && (
                  <span className={styles.gameMetaItem}>
                    <span className={styles.gameMetaLabel}>Metacritic</span>
                    <span style={{ color: gameMeta.metacritic >= 75 ? 'var(--neon)' : gameMeta.metacritic >= 50 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                      {gameMeta.metacritic}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.analyticsLoading}>
            <div className={styles.loadingSpinner} />
            <p>Loading analytics…</p>
          </div>
        ) : !data ? (
          <p style={{ color: 'var(--text-muted)' }}>No analytics available for this game yet.</p>
        ) : (
          <>
            <div className={styles.analyticsGrid}>
              <div className={styles.analyticsCard}>
                <p className={styles.analyticsLabel}>Avg Rating</p>
                <p className={styles.analyticsScore} style={{ color: ratingColor }}>
                  {data.helpfulCount > 0 ? `${data.avgRating.toFixed(1)}/10` : 'N/A'}
                </p>
              </div>
              <div className={styles.analyticsCard}>
                <p className={styles.analyticsLabel}>Verified</p>
                <p className={styles.analyticsScore} style={{ color: 'var(--neon)' }}>{data.helpfulCount}</p>
              </div>
              <div className={styles.analyticsCard}>
                <p className={styles.analyticsLabel}>Total</p>
                <p className={styles.analyticsScore} style={{ color: 'var(--text)' }}>{data.totalReviews}</p>
              </div>
            </div>

            <div className={styles.analyticsBreakdown}>
              <div className={styles.breakdownItem} style={{ color: 'var(--neon)' }}>
                <span className={styles.breakdownNum}>{data.helpfulCount}</span>
                <span className={styles.breakdownLabel}>Verified</span>
              </div>
              <div className={styles.breakdownItem} style={{ color: 'var(--red)' }}>
                <span className={styles.breakdownNum}>{data.spamCount}</span>
                <span className={styles.breakdownLabel}>Spam</span>
              </div>
              <div className={styles.breakdownItem} style={{ color: 'var(--yellow)' }}>
                <span className={styles.breakdownNum}>{data.toxicCount}</span>
                <span className={styles.breakdownLabel}>Toxic</span>
              </div>
            </div>

            {(data.topPros.length > 0 || data.topCons.length > 0) && (
              <div className={styles.analyticsThemes}>
                {data.topPros.length > 0 && (
                  <div>
                    <p className={styles.analyticsLabel} style={{ color: 'var(--neon)', marginBottom: 8 }}>Top Pros</p>
                    <div className={styles.themeList}>
                      {data.topPros.map((p) => (
                        <span key={p} className={styles.themeTag} style={{ borderColor: 'rgba(0,255,135,0.3)', color: 'var(--neon)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data.topCons.length > 0 && (
                  <div>
                    <p className={styles.analyticsLabel} style={{ color: 'var(--red)', marginBottom: 8 }}>Top Cons</p>
                    <div className={styles.themeList}>
                      {data.topCons.map((c) => (
                        <span key={c} className={styles.themeTag} style={{ borderColor: 'rgba(255,71,87,0.3)', color: 'var(--red)' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <a
                href={`/games/${encodeURIComponent(gameTitle)}`}
                style={{ color: 'var(--neon)', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                View full game page →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Trending Section ─────────────────────────────────────────────────────────
type TrendingGame = { gameTitle: string; reviewCount: number; avgRating: number };

function TrendingSection() {
  const [games, setGames]   = useState<TrendingGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trending')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setGames(d.trending ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || games.length === 0) return null;

  return (
    <section className={styles.trendingSection}>
      <p className={styles.askEyebrow}>Last 7 Days · Most Active</p>
      <h2 className={styles.recsTitle}>🔥 Trending Games</h2>
      <div className={styles.trendingGrid}>
        {games.map((g, i) => {
          const ratingColor =
            g.avgRating >= 8 ? 'var(--neon)' : g.avgRating >= 5 ? 'var(--yellow)' : 'var(--red)';
          return (
            <a
              key={g.gameTitle}
              href={`/games/${encodeURIComponent(g.gameTitle)}`}
              className={styles.trendCard}
            >
              <span className={styles.trendRank}>{i + 1}</span>
              <div className={styles.trendInfo}>
                <div className={styles.trendTitle}>{g.gameTitle}</div>
                <div className={styles.trendMeta}>
                  {g.reviewCount} review{g.reviewCount !== 1 ? 's' : ''} this week
                </div>
              </div>
              <span className={styles.trendRating} style={{ color: ratingColor }}>
                {g.avgRating > 0 ? `${g.avgRating.toFixed(1)}` : '—'}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

// ── Recommendations Section ────────────────────────────────────────────────────
function RecommendationsSection() {
  const [tag, setTag] = useState('');
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const fetchRecs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await fetch(
        `/api/recommendations?reviewerTag=${encodeURIComponent(tag.trim())}`,
      );
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setRecs(data.recommendations);
    } catch {
      setError('Could not load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.recsSection}>
      <p className={styles.askEyebrow}>Personalized · Based on Your Review History</p>
      <h2 className={styles.recsTitle}>What should I play next?</h2>
      <form onSubmit={fetchRecs} className={styles.askForm} style={{ marginBottom: 20 }}>
        <input
          className={styles.askInput}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Enter your gamer tag (e.g. Player#99)"
        />
        <button type="submit" className={styles.askBtn} disabled={loading || !tag.trim()}>
          {loading ? <span className={styles.spinner} /> : 'Get Recs'}
        </button>
      </form>

      {error && <p className={styles.askError}>{error}</p>}

      {searched && !loading && recs.length === 0 && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No recommendations yet — submit some reviews first so we can learn your taste.
        </p>
      )}

      {recs.length > 0 && (
        <div className={styles.recGrid}>
          {recs.map((rec, i) => (
            <a
              key={rec.gameTitle}
              href={`/games/${encodeURIComponent(rec.gameTitle)}`}
              className={styles.recCard}
              style={{ textDecoration: 'none' }}
            >
              <div className={styles.recRank}>#{i + 1}</div>
              <div className={styles.recInfo}>
                <p className={styles.recTitle}>{rec.gameTitle}</p>
                <p className={styles.recMeta}>
                  Avg rating <strong style={{ color: 'var(--neon)' }}>{rec.avgRating}/10</strong>
                  {' '}· {rec.reviewCount} {rec.reviewCount === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewCard({ review, onClassify, onAnalytics, gameCover, currentUserTag }: {
  review: Review;
  onClassify?: (id: string) => void;
  onAnalytics?: (gameTitle: string) => void;
  gameCover?: string | null;
  currentUserTag?: string | null;
}) {
  const [votes, setVotes] = useState<{ up: number; down: number } | null>(null);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/${review.id}/vote`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setVotes(d.votes); setUserVote(d.userVote ?? null); }
      })
      .catch(() => {});
  }, [review.id]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!currentUserTag) return;
    setVoteLoading(true);
    if (userVote === type) {
      const res = await fetch(`/api/reviews/${review.id}/vote`, { method: 'DELETE' });
      if (res.ok) { const d = await res.json(); setVotes(d.votes); setUserVote(null); }
    } else {
      const res = await fetch(`/api/reviews/${review.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) { const d = await res.json(); setVotes(d.votes); setUserVote(type); }
    }
    setVoteLoading(false);
  };
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {gameCover && (
            <img
              src={gameCover}
              alt={review.gameTitle}
              className={styles.cardCover}
              onClick={() => onAnalytics?.(review.gameTitle)}
              style={{ cursor: onAnalytics ? 'pointer' : 'default' }}
            />
          )}
          <div>
          <h3
            className={`${styles.gameTitle} ${onAnalytics ? styles.gameTitleLink : ''}`}
            onClick={() => onAnalytics?.(review.gameTitle)}
            title={onAnalytics ? `View ${review.gameTitle} analytics` : undefined}
          >
            {review.gameTitle}
            {onAnalytics && <span className={styles.analyticsHint}>↗</span>}
          </h3>
          <div className={styles.cardMeta}>
            <span className={styles.platform}>{review.platform}</span>
            <span className={styles.dot}>·</span>
            <span className={styles.playtime}>{review.playtime} played</span>
            <span className={styles.dot}>·</span>
            <a
              href={`/profile/${encodeURIComponent(review.reviewerTag)}`}
              className={styles.reviewerLink}
              onClick={(e) => e.stopPropagation()}
            >
              {review.reviewerTag}
            </a>
          </div>
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

      <div className={styles.cardFooter}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <time className={styles.timestamp}>
            {new Date(review.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </time>
          <a href={`/reviews/${review.id}`} className={styles.readMoreLink}>
            Read full review →
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {votes !== null && (
            <div className={styles.voteRow}>
              <button
                className={`${styles.voteBtn} ${userVote === 'up' ? styles.voteBtnActive : ''}`}
                onClick={() => handleVote('up')}
                disabled={voteLoading || !currentUserTag}
                title={currentUserTag ? 'Helpful' : 'Sign in to vote'}
              >
                ▲ {votes.up}
              </button>
              <button
                className={`${styles.voteBtn} ${styles.voteBtnDown} ${userVote === 'down' ? styles.voteBtnDownActive : ''}`}
                onClick={() => handleVote('down')}
                disabled={voteLoading || !currentUserTag}
                title={currentUserTag ? 'Not helpful' : 'Sign in to vote'}
              >
                ▼ {votes.down}
              </button>
            </div>
          )}
          <button
            className={styles.copyLinkBtn}
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/reviews/${review.id}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Copy permalink"
          >
            {copied ? 'Copied!' : '⎘'}
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Submit review modal ────────────────────────────────────────────────────────
function SubmitModal({ onClose, onSuccess, defaultTag }: {
  onClose: () => void;
  onSuccess: (classification: string) => void;
  defaultTag?: string;
}) {
  const [form, setForm] = useState({
    gameTitle: '', platform: '', rating: 7, headline: '',
    body: '', pros: '', cons: '', playtime: '', reviewerTag: defaultTag ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    fetch('/api/drafts')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.draft) {
          const dr = d.draft;
          setForm((prev) => ({
            gameTitle:   dr.gameTitle   ?? prev.gameTitle,
            platform:    dr.platform    ?? prev.platform,
            rating:      dr.rating      ?? prev.rating,
            headline:    dr.headline    ?? prev.headline,
            body:        dr.body        ?? prev.body,
            pros:        dr.pros        ?? prev.pros,
            cons:        dr.cons        ?? prev.cons,
            playtime:    dr.playtime    ?? prev.playtime,
            reviewerTag: dr.reviewerTag ?? prev.reviewerTag,
          }));
        }
        setDraftLoaded(true);
      })
      .catch(() => setDraftLoaded(true));
  }, []);

  // Debounced autosave — only after draft has been loaded to avoid overwriting with defaults
  useEffect(() => {
    if (!draftLoaded) return;
    setDraftStatus('saving');
    const timer = setTimeout(() => {
      const { reviewerTag, ...fields } = form;
      fetch('/api/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, rating: Number(form.rating) }),
      })
        .then(() => setDraftStatus('saved'))
        .catch(() => setDraftStatus('idle'));
    }, 1000);
    return () => clearTimeout(timer);
  }, [form, draftLoaded]);

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

      // Delete draft after successful submission (fire-and-forget)
      fetch('/api/drafts', { method: 'DELETE' }).catch(() => {});

      const classifyRes = await fetch('/api/classify', {
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
      const { classification } = await classifyRes.json();

      onSuccess(classification ?? 'pending');
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

          <div className={styles.formFooter}>
            <span className={styles.draftStatus}>
              {draftStatus === 'saving' && '⏳ Saving draft…'}
              {draftStatus === 'saved'  && '✓ Draft saved'}
            </span>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? <span className={styles.spinner} /> : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ask AI ────────────────────────────────────────────────────────────────────
function AskAI() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState('');
  const [sources, setSources]   = useState<{ gameTitle: string; headline: string; rating: number }[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);
    try {
      const res = await fetch(`/api/ask?q=${encodeURIComponent(question.trim())}`);
      if (!res.ok) throw new Error('Ask failed');
      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch {
      setError('Could not get an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.askSection}>
      <p className={styles.askEyebrow}>Powered by RAG · Real reviews, real answers</p>
      <form onSubmit={handleAsk} className={styles.askForm}>
        <input
          className={styles.askInput}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='Ask anything — "Is Elden Ring worth it on PC?"'
        />
        <button type="submit" className={styles.askBtn} disabled={loading || !question.trim()}>
          {loading ? '…' : 'Ask AI'}
        </button>
      </form>

      {answer && (
        <div className={styles.askAnswer}>
          <p className={styles.answerText}>{answer}</p>
          {sources.length > 0 && (
            <div className={styles.sources}>
              <span className={styles.sourcesLabel}>Based on:</span>
              {sources.map((s, i) => (
                <span key={i} className={styles.sourceTag}>
                  {s.gameTitle} · {s.rating}/10
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className={styles.askError}>{error}</p>}
    </section>
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [analyticsGame, setAnalyticsGame] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [gameCovers, setGameCovers] = useState<Record<string, string>>({});
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');
  const [feedReviews, setFeedReviews] = useState<Review[]>([]);
  const [feedFollowedCount, setFeedFollowedCount] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchPlatform, setSearchPlatform] = useState('');
  const [searchMinRating, setSearchMinRating] = useState('');
  const [searchMaxRating, setSearchMaxRating] = useState('');
  const [searchSort, setSearchSort]         = useState('newest');
  const [searchResults, setSearchResults]   = useState<Review[] | null>(null);
  const [searchTotal, setSearchTotal]       = useState(0);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchActive, setSearchActive]     = useState(false);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: string; type: string; actorTag: string | null; gameTitle: string | null; read: boolean; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = () => {
    fetch('/api/notifications')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setNotifs(d.notifications); setUnreadCount(d.unreadCount); } })
      .catch(() => {});
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
    setUnreadCount(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Load session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setCurrentUser(d.user);
          fetchNotifs();
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
  };

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

      // Fetch cover art for unique game titles (fire-and-forget, best-effort)
      const titles = Array.from(new Set<string>(filtered.map((r: Review) => r.gameTitle)));
      setGameCovers((prev) => {
        const missing = titles.filter((t) => !(t in prev));
        if (missing.length === 0) return prev;
        missing.forEach((title) => {
          fetch(`/api/games/${encodeURIComponent(title)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => {
              if (d?.game?.coverUrl) {
                setGameCovers((c) => ({ ...c, [title]: d.game.coverUrl }));
              }
            })
            .catch(() => {});
        });
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const fetchFeed = useCallback(async () => {
    if (!currentUser) return;
    setFeedLoading(true);
    try {
      const res = await fetch('/api/feed');
      if (res.ok) {
        const data = await res.json();
        setFeedReviews(data.reviews ?? []);
        setFeedFollowedCount(data.followedCount ?? 0);
      }
    } finally {
      setFeedLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { if (feedTab === 'following') fetchFeed(); }, [feedTab, fetchFeed]);

  // Run search whenever any search param changes (debounced 300ms)
  useEffect(() => {
    const hasFilters = searchQuery || searchPlatform || searchMinRating || searchMaxRating || searchSort !== 'newest';
    if (!hasFilters && !searchActive) return;

    setSearchActive(true);
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const params = new URLSearchParams();
      if (searchQuery)     params.set('q',             searchQuery);
      if (searchPlatform)  params.set('platform',      searchPlatform);
      if (searchMinRating) params.set('minRating',     searchMinRating);
      if (searchMaxRating) params.set('maxRating',     searchMaxRating);
      if (searchSort)      params.set('sort',          searchSort);
      const res = await fetch(`/api/search?${params}`).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setSearchResults(data.reviews);
        setSearchTotal(data.total);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPlatform, searchMinRating, searchMaxRating, searchSort]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSearch = () => {
    setSearchQuery('');
    setSearchPlatform('');
    setSearchMinRating('');
    setSearchMaxRating('');
    setSearchSort('newest');
    setSearchResults(null);
    setSearchTotal(0);
    setSearchActive(false);
  };

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
      {/* ── Auth header bar ── */}
      <div className={styles.authBar}>
        {currentUser ? (
          <div className={styles.authUser}>
            {currentUser.role === 'admin' && (
              <a href="/admin" className={styles.adminLink}>Admin</a>
            )}
            <a href={`/profile/${encodeURIComponent(currentUser.gamerTag)}`} className={styles.authTag}>
              {currentUser.gamerTag}
            </a>
            <div style={{ position: 'relative' }}>
              <button
                className={styles.bellBtn}
                onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) fetchNotifs(); }}
                aria-label="Notifications"
              >
                🔔{unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className={styles.notifPanel}>
                  <div className={styles.notifHeader}>
                    <span>Notifications</span>
                    {unreadCount > 0 && <button className={styles.markReadBtn} onClick={markAllRead}>Mark all read</button>}
                  </div>
                  {notifs.length === 0 ? (
                    <p className={styles.notifEmpty}>No notifications yet.</p>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className={`${styles.notifItem} ${n.read ? styles.notifRead : ''}`}>
                        <span className={styles.notifText}>
                          {n.type === 'follow' && `${n.actorTag} started following you`}
                          {n.type === 'vote_up' && `${n.actorTag} liked your review of ${n.gameTitle}`}
                          {n.type === 'vote_down' && `${n.actorTag} disliked your review of ${n.gameTitle}`}
                          {n.type === 'reclassify' && `Your review of ${n.gameTitle} was reclassified`}
                        </span>
                        {!n.read && <span className={styles.notifDot} />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <a href="/games" className={styles.authLink}>Games</a>
            <a href="/search" className={styles.authLink}>Search</a>
            <a href="/leaderboard" className={styles.authLink}>Leaderboard</a>
            <a href="/settings" className={styles.authLink}>Settings</a>
            <button className={styles.authLink} onClick={handleLogout}>Sign out</button>
          </div>
        ) : (
          <button className={styles.authLink} onClick={() => setShowAuth(true)}>Sign in / Register</button>
        )}
      </div>

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
          <button
            className={styles.heroBtn}
            onClick={() => currentUser ? setShowModal(true) : setShowAuth(true)}
          >
            {currentUser ? 'Write a Review' : 'Sign In to Review'}
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

      {/* ── Ask AI ── */}
      <AskAI />

      {/* ── Trending Games ── */}
      <TrendingSection />

      {/* ── Feed tab switcher ── */}
      {currentUser && (
        <div className={styles.feedTabBar}>
          <button
            className={`${styles.feedTabBtn} ${feedTab === 'all' ? styles.feedTabBtnActive : ''}`}
            onClick={() => setFeedTab('all')}
          >
            All Reviews
          </button>
          <button
            className={`${styles.feedTabBtn} ${feedTab === 'following' ? styles.feedTabBtnActive : ''}`}
            onClick={() => setFeedTab('following')}
          >
            Following
          </button>
        </div>
      )}

      {/* ── Search & filter panel (All tab only) ── */}
      {feedTab === 'all' && (
        <section className={styles.filterSection}>
          {/* Keyword + quick classification tabs */}
          <div className={styles.filterBar}>
            <div className={styles.filterTabs}>
              {(['helpful', 'all', 'spam', 'toxic'] as const).map((f) => (
                <button
                  key={f}
                  className={`${styles.filterTab} ${!searchActive && filter === f ? styles.filterTabActive : ''}`}
                  onClick={() => { clearSearch(); setFilter(f); }}
                >
                  {f === 'helpful' ? '✓ Verified' : f === 'all' ? 'All' : f === 'spam' ? '✗ Spam' : '⚠ Toxic'}
                </button>
              ))}
            </div>
            <input
              className={styles.searchInput}
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Advanced filters row */}
          <div className={styles.advancedFilters}>
            <select
              className={styles.filterSelect}
              value={searchPlatform}
              onChange={(e) => setSearchPlatform(e.target.value)}
            >
              <option value="">All Platforms</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              className={styles.filterSelect}
              value={searchMinRating}
              onChange={(e) => setSearchMinRating(e.target.value)}
            >
              <option value="">Min Rating</option>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>

            <select
              className={styles.filterSelect}
              value={searchMaxRating}
              onChange={(e) => setSearchMaxRating(e.target.value)}
            >
              <option value="">Max Rating</option>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>≤{n}</option>)}
            </select>

            <select
              className={styles.filterSelect}
              value={searchSort}
              onChange={(e) => setSearchSort(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>

            {searchActive && (
              <button className={styles.clearBtn} onClick={clearSearch}>
                Clear ✕
              </button>
            )}
          </div>

          {/* Result count */}
          {searchActive && !searchLoading && (
            <p className={styles.resultCount}>
              Found <strong>{searchTotal}</strong> {searchTotal === 1 ? 'review' : 'reviews'}
            </p>
          )}
        </section>
      )}

      {/* ── Reviews feed ── */}
      <section className={styles.feed}>
        {feedTab === 'following' ? (
          feedLoading ? (
            <div className={styles.loading}><div className={styles.loadingSpinner} /><p>Loading feed...</p></div>
          ) : feedReviews.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyIcon}>👥</p>
              <p className={styles.emptyText}>
                {feedFollowedCount === 0 ? 'You\'re not following anyone yet.' : 'No reviews from people you follow.'}
              </p>
              <p className={styles.emptySubtext}>Visit a reviewer's profile and hit Follow to build your feed.</p>
            </div>
          ) : (
            <div className={styles.reviewGrid}>
              {feedReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onAnalytics={setAnalyticsGame}
                  gameCover={gameCovers[review.gameTitle]}
                  currentUserTag={currentUser?.gamerTag}
                />
              ))}
            </div>
          )
        ) : searchActive ? (
          searchLoading ? (
            <div className={styles.loading}><div className={styles.loadingSpinner} /><p>Searching...</p></div>
          ) : searchResults && searchResults.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyIcon}>🔍</p>
              <p className={styles.emptyText}>No reviews match your search.</p>
              <p className={styles.emptySubtext}>Try different keywords or clear the filters.</p>
              <button className={styles.heroBtn} onClick={clearSearch}>Clear filters</button>
            </div>
          ) : (
            <div className={styles.reviewGrid}>
              {(searchResults ?? []).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onAnalytics={setAnalyticsGame}
                  gameCover={gameCovers[review.gameTitle]}
                  currentUserTag={currentUser?.gamerTag}
                />
              ))}
            </div>
          )
        ) : loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🎮</p>
            <p className={styles.emptyText}>No reviews found.</p>
            <p className={styles.emptySubtext}>Be the first to write one.</p>
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
                onAnalytics={setAnalyticsGame}
                gameCover={gameCovers[review.gameTitle]}
                currentUserTag={currentUser?.gamerTag}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Recommendations ── */}
      <RecommendationsSection />

      {/* ── Submit modal ── */}
      {toast && (
        <div className={styles.toast} data-type={toast.type}>
          {toast.message}
          <button className={styles.toastClose} onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ── Game Analytics Modal ── */}
      {analyticsGame && (
        <GameAnalyticsModal
          gameTitle={analyticsGame}
          onClose={() => setAnalyticsGame(null)}
        />
      )}

      {/* ── Auth modal ── */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(user) => { setCurrentUser(user); setShowAuth(false); }}
        />
      )}

      {showModal && (
        <SubmitModal
          onClose={() => setShowModal(false)}
          defaultTag={currentUser?.gamerTag}
          onSuccess={(classification) => {
            setShowModal(false);
            if (classification === 'helpful') {
              setFilter('helpful');
              setToast({ message: '✓ Your review is live in the Verified feed!', type: 'success' });
            } else if (classification === 'spam') {
              setFilter('spam');
              setToast({ message: '⚠ Your review was flagged as spam by our AI and moved to the Spam tab.', type: 'warn' });
            } else if (classification === 'toxic') {
              setFilter('toxic');
              setToast({ message: '⚠ Your review was flagged as toxic content and moved to the Toxic tab.', type: 'warn' });
            } else {
              setToast({ message: 'Review submitted — classification pending.', type: 'warn' });
            }
            setTimeout(() => setToast(null), 6000);
            fetchReviews();
          }}
        />
      )}
    </main>
  );
}
