import { Metadata } from 'next';
import { getOrFetchGame } from '@/lib/gameService';
import { getGameAnalytics } from '@/lib/gameAnalytics';
import { getReviewsByGame } from '@/lib/reviewStore';
import styles from './game-page.module.css';

type Props = { params: { title: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = decodeURIComponent(params.title);
  const game  = await getOrFetchGame(title).catch(() => null);
  return {
    title: game ? `${game.title} Reviews | Gamers' Feedback` : `${title} | Gamers' Feedback`,
    description: game?.description?.slice(0, 160) ?? `Player reviews for ${title} on Gamers' Feedback.`,
    openGraph: { images: game?.coverUrl ? [game.coverUrl] : [] },
  };
}

export default async function GamePage({ params }: Props) {
  const title = decodeURIComponent(params.title);

  const [game, analytics, reviews] = await Promise.all([
    getOrFetchGame(title).catch(() => null),
    getGameAnalytics(title),
    getReviewsByGame(title),
  ]);

  const maxPlatformCount = analytics.platformBreakdown[0]?.count ?? 1;

  const ratingColor = (r: number) =>
    r >= 8 ? 'var(--neon)' : r >= 5 ? 'var(--yellow)' : 'var(--red)';

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/" className={styles.navLink}>← Reviews</a>
        <span className={styles.sep}>/</span>
        <a href="/leaderboard" className={styles.navLink}>Leaderboard</a>
        <span className={styles.sep}>/</span>
        <span style={{ color: 'var(--text-muted)' }}>{title}</span>
      </nav>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        {game?.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} className={styles.cover} />
        ) : (
          <div className={styles.coverPlaceholder}>🎮</div>
        )}
        <div className={styles.heroInfo}>
          <h1 className={styles.title}>{game?.title ?? title}</h1>
          {game?.genres && (
            <div className={styles.genreTags}>
              {game.genres.split(', ').map((g) => (
                <span key={g} className={styles.genreTag}>{g}</span>
              ))}
            </div>
          )}
          <div className={styles.metaRow}>
            {game?.releaseDate && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Released</span>
                <span className={styles.metaValue}>{game.releaseDate}</span>
              </div>
            )}
            {game?.developer && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Developer</span>
                <span className={styles.metaValue}>{game.developer}</span>
              </div>
            )}
            {game?.metacritic != null && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Metacritic</span>
                <span
                  className={styles.metaValue}
                  style={{ color: game.metacritic >= 75 ? 'var(--neon)' : game.metacritic >= 50 ? 'var(--yellow)' : 'var(--red)' }}
                >
                  {game.metacritic}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat bar ── */}
      <div className={styles.statBar}>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: ratingColor(analytics.avgRating) }}>
            {analytics.helpfulCount > 0 ? analytics.avgRating.toFixed(1) : '—'}
          </span>
          <span className={styles.statLabel}>Avg Rating</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{analytics.helpfulCount}</span>
          <span className={styles.statLabel}>Verified</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum} style={{ color: 'var(--text-muted)' }}>{analytics.totalReviews}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        {analytics.spamCount > 0 && (
          <div className={styles.stat}>
            <span className={styles.statNum} style={{ color: 'var(--red)' }}>{analytics.spamCount}</span>
            <span className={styles.statLabel}>Spam</span>
          </div>
        )}
      </div>

      {/* ── Platform breakdown ── */}
      {analytics.platformBreakdown.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>By Platform</p>
          <div className={styles.platformList}>
            {analytics.platformBreakdown.map(({ platform, count }) => (
              <div key={platform} className={styles.platformRow}>
                <span className={styles.platformName}>{platform}</span>
                <div className={styles.platformBar}>
                  <div
                    className={styles.platformFill}
                    style={{ width: `${(count / maxPlatformCount) * 100}%` }}
                  />
                </div>
                <span className={styles.platformCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Pros / Cons ── */}
      {(analytics.topPros.length > 0 || analytics.topCons.length > 0) && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>What Players Say</p>
          <div className={styles.termGrid}>
            {analytics.topPros.length > 0 && (
              <div className={styles.termGroup}>
                <span className={styles.termGroupLabel} style={{ color: 'var(--neon)' }}>Top Pros</span>
                <div className={styles.termTags}>
                  {analytics.topPros.map((t) => (
                    <span key={t} className={`${styles.termTag} ${styles.termTagPro}`}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {analytics.topCons.length > 0 && (
              <div className={styles.termGroup}>
                <span className={styles.termGroupLabel} style={{ color: 'var(--red)' }}>Top Cons</span>
                <div className={styles.termTags}>
                  {analytics.topCons.map((t) => (
                    <span key={t} className={`${styles.termTag} ${styles.termTagCon}`}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Review list ── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          Verified Reviews ({analytics.helpfulCount})
        </p>
        {reviews.length === 0 ? (
          <p className={styles.emptyReviews}>No verified reviews yet.</p>
        ) : (
          <div className={styles.reviewList}>
            {reviews.map((r) => (
              <a
                key={r.id}
                href={`/reviews/${r.id}`}
                className={styles.reviewItem}
              >
                <div className={styles.reviewHeader}>
                  <span
                    className={styles.reviewRating}
                    style={{ color: ratingColor(r.rating) }}
                  >
                    {r.rating}/10
                  </span>
                  <span className={styles.reviewHeadline}>{r.headline}</span>
                </div>
                <div className={styles.reviewMeta}>
                  {r.reviewerTag} · {r.platform} · {r.playtime}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
