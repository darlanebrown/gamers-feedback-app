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
  sentimentScore: number | null;
  topPros: string[];
  topCons: string[];
  bombAlert: boolean;
  trend: 'improving' | 'declining' | 'stable';
};

type Recommendation = {
  gameTitle: string;
  avgRating: number;
  reviewCount: number;
};

type SessionUser = { id: string; email: string; gamerTag: string };

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
function GameAnalyticsModal({ gameTitle, apiUrl, onClose }: {
  gameTitle: string;
  apiUrl: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/analytics/${encodeURIComponent(gameTitle)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gameTitle, apiUrl]);

  const trendColor = data?.trend === 'improving'
    ? 'var(--neon)' : data?.trend === 'declining'
    ? 'var(--red)' : 'var(--yellow)';
  const trendIcon = data?.trend === 'improving' ? '↑' : data?.trend === 'declining' ? '↓' : '→';

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

        {loading ? (
          <div className={styles.analyticsLoading}>
            <div className={styles.loadingSpinner} />
            <p>Loading analytics…</p>
          </div>
        ) : !data ? (
          <p style={{ color: 'var(--text-muted)' }}>Could not load analytics. Is the Python backend running?</p>
        ) : (
          <>
            {data.bombAlert && (
              <div className={styles.bombBanner}>
                <span className={styles.bombIcon}>⚠</span>
                <span>Review bombing detected — {data.totalReviews}+ negative reviews in the last 2 hours.</span>
              </div>
            )}

            <div className={styles.analyticsGrid}>
              {/* Sentiment score */}
              <div className={styles.analyticsCard}>
                <p className={styles.analyticsLabel}>Sentiment Score</p>
                <p className={styles.analyticsScore} style={{
                  color: data.sentimentScore !== null
                    ? data.sentimentScore >= 8 ? 'var(--neon)' : data.sentimentScore >= 5 ? 'var(--yellow)' : 'var(--red)'
                    : 'var(--text-dim)'
                }}>
                  {data.sentimentScore !== null ? `${data.sentimentScore}/10` : 'N/A'}
                </p>
              </div>

              {/* Trend */}
              <div className={styles.analyticsCard}>
                <p className={styles.analyticsLabel}>Trend</p>
                <p className={styles.analyticsTrend} style={{ color: trendColor }}>
                  {trendIcon} {data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}
                </p>
              </div>

              {/* Counts */}
              <div className={styles.analyticsCard}>
                <p className={styles.analyticsLabel}>Total Reviews</p>
                <p className={styles.analyticsScore} style={{ color: 'var(--text)' }}>{data.totalReviews}</p>
              </div>
            </div>

            {/* Breakdown */}
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

            {/* Pros & Cons themes */}
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
          </>
        )}
      </div>
    </div>
  );
}

// ── Recommendations Section ────────────────────────────────────────────────────
function RecommendationsSection({ apiUrl }: { apiUrl: string }) {
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
        `${apiUrl}/api/recommendations?reviewerTag=${encodeURIComponent(tag.trim())}`,
      );
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setRecs(data.recommendations);
    } catch {
      setError('Could not load recommendations. Make sure the Python backend is running.');
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
            <div key={rec.gameTitle} className={styles.recCard}>
              <div className={styles.recRank}>#{i + 1}</div>
              <div className={styles.recInfo}>
                <p className={styles.recTitle}>{rec.gameTitle}</p>
                <p className={styles.recMeta}>
                  Avg rating <strong style={{ color: 'var(--neon)' }}>{rec.avgRating}/10</strong>
                  {' '}· {rec.reviewCount} {rec.reviewCount === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewCard({ review, onClassify, onAnalytics }: {
  review: Review;
  onClassify?: (id: string) => void;
  onAnalytics?: (gameTitle: string) => void;
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

// ── Ask AI ────────────────────────────────────────────────────────────────────
function AskAI() {
  const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<{ gameTitle: string; headline: string; rating: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!apiUrl) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);
    try {
      const res = await fetch(`${apiUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('Ask failed');
      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch {
      setError('Could not reach the Python backend. Make sure it is running on port 8000.');
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
          {loading ? <span className={styles.spinner} /> : 'Ask AI'}
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

  const fastapiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL ?? '';

  // Load session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCurrentUser(d.user))
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
      {/* ── Auth header bar ── */}
      <div className={styles.authBar}>
        {currentUser ? (
          <div className={styles.authUser}>
            <a href={`/profile/${encodeURIComponent(currentUser.gamerTag)}`} className={styles.authTag}>
              {currentUser.gamerTag}
            </a>
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
                onAnalytics={fastapiUrl ? setAnalyticsGame : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Recommendations ── */}
      {fastapiUrl && <RecommendationsSection apiUrl={fastapiUrl} />}

      {/* ── Submit modal ── */}
      {toast && (
        <div className={styles.toast} data-type={toast.type}>
          {toast.message}
          <button className={styles.toastClose} onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ── Game Analytics Modal ── */}
      {analyticsGame && fastapiUrl && (
        <GameAnalyticsModal
          gameTitle={analyticsGame}
          apiUrl={fastapiUrl}
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
