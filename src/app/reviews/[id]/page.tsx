import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getReviewById, findSimilarReviewsById } from '@/lib/reviewStore';
import { getOrFetchGame } from '@/lib/gameService';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth';
import styles from './review-page.module.css';
import ShareButton from './ShareButton';
import ReviewActions from './ReviewActions';
import VoteBar from './VoteBar';
import NotificationBell from '@/app/components/NotificationBell';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const review = await getReviewById(params.id);
  if (!review) return { title: 'Review Not Found | Gamers\' Feedback' };

  const game = await getOrFetchGame(review.gameTitle).catch(() => null);
  const title = `"${review.headline}" — ${review.gameTitle} | Gamers' Feedback`;
  const description = review.body.slice(0, 160);
  const images = game?.coverUrl
    ? [{ url: game.coverUrl, width: 600, height: 400, alt: review.gameTitle }]
    : [];

  return {
    title,
    description,
    openGraph: {
      title: `"${review.headline}"`,
      description,
      images,
      type: 'article',
      authors: [review.reviewerTag],
    },
    twitter: {
      card: 'summary_large_image',
      title: `"${review.headline}" — ${review.gameTitle}`,
      description,
      images: game?.coverUrl ? [game.coverUrl] : [],
    },
  };
}

const CLASS_MAP: Record<string, { label: string; color: string }> = {
  helpful: { label: '✓ Verified Review', color: 'var(--neon)' },
  spam:    { label: '✗ Spam',            color: 'var(--red)' },
  toxic:   { label: '⚠ Toxic',          color: 'var(--yellow)' },
  pending: { label: '◌ Pending',         color: 'var(--text-muted)' },
};

export default async function ReviewPage({ params }: Props) {
  const review = await getReviewById(params.id);
  if (!review) notFound();

  const token = cookies().get(SESSION_COOKIE)?.value;
  const [game, similar, session] = await Promise.all([
    getOrFetchGame(review.gameTitle).catch(() => null),
    findSimilarReviewsById(params.id, 3).catch(() => []),
    token ? verifyToken(token).catch(() => null) : Promise.resolve(null),
  ]);

  const isOwner = session?.gamerTag === review.reviewerTag;
  const isAdmin = session?.role === 'admin';
  const cls = CLASS_MAP[review.classification] ?? CLASS_MAP.pending;
  const ratingColor = review.rating >= 8 ? 'var(--neon)' : review.rating >= 5 ? 'var(--yellow)' : 'var(--red)';

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <div className={styles.breadcrumbLeft}>
          <a href="/" className={styles.navLink}>← All Reviews</a>
          <span className={styles.sep}>/</span>
          <a href={`/profile/${encodeURIComponent(review.reviewerTag)}`} className={styles.navLink}>
            {review.reviewerTag}
          </a>
        </div>
        <NotificationBell />
      </nav>

      <article className={styles.card}>
        {/* Game header */}
        <header className={styles.header}>
          {game?.coverUrl && (
            <img src={game.coverUrl} alt={review.gameTitle} className={styles.cover} />
          )}
          <div className={styles.headerInfo}>
            <h1 className={styles.gameTitle}>{review.gameTitle}</h1>
            <div className={styles.meta}>
              <span className={styles.platform}>{review.platform}</span>
              <span className={styles.dot}>·</span>
              <span>{review.playtime} played</span>
              <span className={styles.dot}>·</span>
              <a href={`/profile/${encodeURIComponent(review.reviewerTag)}`} className={styles.reviewerLink}>
                {review.reviewerTag}
              </a>
            </div>
            {game && (
              <div className={styles.gameMeta}>
                {game.genres && <span className={styles.genre}>{game.genres.split(', ')[0]}</span>}
                {game.releaseDate && <span className={styles.gameMetaItem}>{game.releaseDate}</span>}
                {game.developer && <span className={styles.gameMetaItem}>{game.developer}</span>}
                {game.metacritic !== null && (
                  <span className={styles.metacritic} style={{
                    color: game.metacritic >= 75 ? 'var(--neon)' : game.metacritic >= 50 ? 'var(--yellow)' : 'var(--red)',
                  }}>
                    MC {game.metacritic}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Rating + classification */}
        <div className={styles.scoreRow}>
          <div className={styles.ratingBlock}>
            <span className={styles.rating} style={{ color: ratingColor }}>{review.rating}</span>
            <span className={styles.ratingMax}>/10</span>
            <div className={styles.ratingTrack}>
              <div className={styles.ratingFill} style={{ width: `${review.rating * 10}%`, background: ratingColor }} />
            </div>
          </div>
          <span className={styles.classBadge} style={{ color: cls.color, borderColor: cls.color }}>
            {cls.label}
          </span>
        </div>

        {/* Headline + body */}
        <h2 className={styles.headline}>"{review.headline}"</h2>
        <p className={styles.body}>{review.body}</p>

        {/* Pros / cons */}
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

        {review.classificationReason && (
          <p className={styles.aiReason}>AI: {review.classificationReason}</p>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <time className={styles.timestamp}>
            {new Date(review.createdAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </time>
          <ShareButton reviewId={review.id} />
        </footer>

        <VoteBar reviewId={review.id} isLoggedIn={!!session} />

        {(isOwner || isAdmin) && (
          <ReviewActions
            reviewId={review.id}
            initial={{
              headline: review.headline,
              body:     review.body,
              pros:     review.pros ?? '',
              cons:     review.cons ?? '',
              rating:   review.rating,
              playtime: review.playtime ?? '',
            }}
          />
        )}
      </article>

      {similar.length > 0 && (
        <section className={styles.similar}>
          <p className={styles.similarLabel}>Similar Reviews</p>
          <div className={styles.similarList}>
            {similar.map((s) => {
              const c = s.rating >= 8 ? 'var(--neon)' : s.rating >= 5 ? 'var(--yellow)' : 'var(--red)';
              return (
                <a key={s.id} href={`/reviews/${s.id}`} className={styles.similarCard}>
                  <div className={styles.similarTop}>
                    <span className={styles.similarGame}>{s.gameTitle}</span>
                    <span className={styles.similarRating} style={{ color: c }}>{s.rating}/10</span>
                  </div>
                  <p className={styles.similarHeadline}>"{s.headline}"</p>
                  <p className={styles.similarMeta}>{s.reviewerTag} · {s.platform}</p>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
