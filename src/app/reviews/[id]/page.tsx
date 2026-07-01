import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReviewById } from '@/lib/reviewStore';
import { getOrFetchGame } from '@/lib/gameService';
import styles from './review-page.module.css';
import ShareButton from './ShareButton';

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

  const game = await getOrFetchGame(review.gameTitle).catch(() => null);
  const cls = CLASS_MAP[review.classification] ?? CLASS_MAP.pending;
  const ratingColor = review.rating >= 8 ? 'var(--neon)' : review.rating >= 5 ? 'var(--yellow)' : 'var(--red)';

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/" className={styles.navLink}>← All Reviews</a>
        <span className={styles.sep}>/</span>
        <a href={`/profile/${encodeURIComponent(review.reviewerTag)}`} className={styles.navLink}>
          {review.reviewerTag}
        </a>
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
      </article>
    </main>
  );
}
