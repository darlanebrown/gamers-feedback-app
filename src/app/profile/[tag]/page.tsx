'use client';

import { useState, useEffect } from 'react';
import { Review } from '@/types';
import styles from './profile.module.css';
import mainStyles from '@/app/page.module.css';
import NotificationBell from '@/app/components/NotificationBell';

type Reputation = { score: number; badge: 'Gold' | 'Silver' | 'Bronze' | null };
type Stats = { total: number; helpful: number; spam: number; toxic: number; avgRating: number };
type Social = { followers: number; following: number; viewerFollows: boolean };
type UserInfo = { displayName: string | null; bio: string | null; gamerTag: string } | null;

const BADGE_COLORS: Record<string, string> = {
  Gold:   '#ffd700',
  Silver: '#c0c0c0',
  Bronze: '#cd7f32',
};

export default function ProfilePage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [games, setGames]           = useState<string[]>([]);
  const [reputation, setReputation] = useState<Reputation>({ score: 0, badge: null });
  const [stats, setStats]           = useState<Stats>({ total: 0, helpful: 0, spam: 0, toxic: 0, avgRating: 0 });
  const [social, setSocial]         = useState<Social>({ followers: 0, following: 0, viewerFollows: false });
  const [userInfo, setUserInfo]     = useState<UserInfo>(null);
  const [loading, setLoading]       = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [filter, setFilter]         = useState<'all' | 'helpful' | 'spam' | 'toxic'>('all');
  const [currentUserTag, setCurrentUserTag] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCurrentUserTag(d.user?.gamerTag ?? null))
      .catch(() => {});
  }, []);

  const loadProfile = () => {
    fetch(`/api/profile/${encodeURIComponent(tag)}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews ?? []);
        setGames(data.games ?? []);
        setReputation(data.reputation ?? { score: 0, badge: null });
        setStats(data.stats ?? { total: 0, helpful: 0, spam: 0, toxic: 0, avgRating: 0 });
        setSocial(data.social ?? { followers: 0, following: 0, viewerFollows: false });
        setUserInfo(data.user ?? null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, [tag]);

  const handleFollow = async () => {
    setFollowLoading(true);
    const method = social.viewerFollows ? 'DELETE' : 'POST';
    await fetch(`/api/profile/${encodeURIComponent(tag)}/follow`, { method });
    await loadProfile();
    setFollowLoading(false);
  };

  const displayed = filter === 'all'
    ? reviews
    : reviews.filter((r) => r.classification === filter);

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <a href="/" className={styles.back}>← Back to reviews</a>
        <NotificationBell />
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={mainStyles.loadingSpinner} />
        </div>
      ) : (
        <>
          {/* ── Profile header ── */}
          <header className={styles.header}>
            <div className={styles.avatar}>
              {tag.charAt(0).toUpperCase()}
            </div>
            <div className={styles.headerInfo}>
              <div className={styles.headerTop}>
                <div>
                  {userInfo?.displayName ? (
                    <>
                      <h1 className={styles.displayName}>{userInfo.displayName}</h1>
                      <p className={styles.tagSub}>{tag}</p>
                    </>
                  ) : (
                    <h1 className={styles.tag}>{tag}</h1>
                  )}
                  {userInfo?.bio && (
                    <p className={styles.bio}>{userInfo.bio}</p>
                  )}
                </div>
                {currentUserTag && currentUserTag !== tag && (
                  <button
                    className={`${styles.followBtn} ${social.viewerFollows ? styles.followBtnActive : ''}`}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {followLoading ? '…' : social.viewerFollows ? 'Following' : '+ Follow'}
                  </button>
                )}
              </div>
              <div className={styles.socialCounts}>
                <span><strong>{social.followers}</strong> followers</span>
                <span className={styles.dot}>·</span>
                <span><strong>{social.following}</strong> following</span>
              </div>
              {reputation.badge && (
                <span
                  className={styles.badge}
                  style={{ color: BADGE_COLORS[reputation.badge], borderColor: BADGE_COLORS[reputation.badge] }}
                >
                  {reputation.badge === 'Gold' ? '★' : reputation.badge === 'Silver' ? '◆' : '●'}{' '}
                  {reputation.badge} Reviewer · {reputation.score}% helpful
                </span>
              )}
              {!reputation.badge && (
                <span className={styles.badgeEmpty}>No reviews yet</span>
              )}
            </div>
          </header>

          {/* ── Stats bar ── */}
          <div className={styles.statsBar}>
            {[
              { label: 'Total Reviews', value: stats.total },
              { label: 'Verified',      value: stats.helpful },
              { label: 'Avg Rating',    value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)}/10` : '—' },
              { label: 'Spam Flagged',  value: stats.spam },
              { label: 'Toxic Flagged', value: stats.toxic },
            ].map((s) => (
              <div key={s.label} className={styles.stat}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Games Reviewed ── */}
          {games.length > 0 && (
            <div className={styles.gamesSection}>
              <p className={styles.gamesSectionLabel}>Games Reviewed</p>
              <div className={styles.gameChips}>
                {games.map((g) => (
                  <a key={g} href={`/games/${encodeURIComponent(g)}`} className={styles.gameChip}>
                    {g}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Filter tabs ── */}
          {reviews.length > 0 && (
            <div className={styles.filterRow}>
              {(['all', 'helpful', 'spam', 'toxic'] as const).map((f) => (
                <button
                  key={f}
                  className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'helpful' ? '✓ Verified' : f === 'spam' ? '✗ Spam' : '⚠ Toxic'}
                  <span className={styles.filterCount}>
                    {f === 'all' ? reviews.length : reviews.filter(r => r.classification === f).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Reviews ── */}
          {displayed.length === 0 ? (
            <p className={styles.empty}>No {filter === 'all' ? '' : filter} reviews yet.</p>
          ) : (
            <div className={styles.reviewList}>
              {displayed.map((review) => (
                <article key={review.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <a
                        href={`/games/${encodeURIComponent(review.gameTitle)}`}
                        className={styles.gameTitle}
                      >
                        {review.gameTitle}
                      </a>
                      <p className={styles.cardMeta}>{review.platform} · {review.playtime} played</p>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.rating} style={{
                        color: review.rating >= 8 ? 'var(--neon)' : review.rating >= 5 ? 'var(--yellow)' : 'var(--red)',
                      }}>
                        {review.rating}<span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/10</span>
                      </span>
                      <span
                        className={styles.classBadge}
                        style={{
                          color: review.classification === 'helpful' ? 'var(--neon)' : review.classification === 'spam' ? 'var(--red)' : 'var(--yellow)',
                          borderColor: review.classification === 'helpful' ? 'var(--neon)' : review.classification === 'spam' ? 'var(--red)' : 'var(--yellow)',
                        }}
                      >
                        {review.classification === 'helpful' ? '✓ Verified' : review.classification === 'spam' ? '✗ Spam' : '⚠ Toxic'}
                      </span>
                    </div>
                  </div>
                  <a href={`/reviews/${review.id}`} className={styles.headlineLink}>
                    "{review.headline}"
                  </a>
                  <p className={styles.body}>{review.body}</p>
                  <time className={styles.time}>
                    {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
