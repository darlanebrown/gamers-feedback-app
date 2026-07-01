'use client';

import { useState, useEffect, useCallback } from 'react';
import { Review } from '@/types';
import styles from './feed.module.css';
import NotificationBell from '@/app/components/NotificationBell';

const LIMIT = 10;

export default function FeedPage() {
  const [reviews, setReviews]         = useState<Review[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [followedCount, setFollowedCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loggedIn, setLoggedIn]       = useState<boolean | null>(null);

  const fetchFeed = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/feed?page=${p}&limit=${LIMIT}`)
      .then((r) => {
        if (r.status === 401) { setLoggedIn(false); return null; }
        setLoggedIn(true);
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setReviews(d.reviews ?? []);
        setTotal(d.total ?? 0);
        setFollowedCount(d.followedCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFeed(1); }, [fetchFeed]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const goTo = (p: number) => {
    setPage(p);
    fetchFeed(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loggedIn === false) {
    return (
      <main className={styles.page}>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>← Reviews</a>
        </nav>
        <div className={styles.empty}>
          <p>Sign in to see reviews from people you follow.</p>
          <a href="/" className={styles.cta}>Go to home page →</a>
        </div>
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
        <p className={styles.eyebrow}>Social · Following</p>
        <h1 className={styles.title}>Your Feed</h1>
        {!loading && (
          <p className={styles.subtitle}>
            {followedCount === 0
              ? 'You\'re not following anyone yet.'
              : `Reviews from ${followedCount} ${followedCount === 1 ? 'person' : 'people'} you follow · ${total} total`}
          </p>
        )}
      </header>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div className={styles.empty}>
          {followedCount === 0 ? (
            <>
              <p>Follow reviewers to see their latest reviews here.</p>
              <a href="/leaderboard" className={styles.cta}>Browse top reviewers →</a>
            </>
          ) : (
            <p>No reviews from the people you follow yet.</p>
          )}
        </div>
      ) : (
        <>
          <p className={styles.paginationInfo}>
            {total} reviews · page {page} of {totalPages}
          </p>

          <div className={styles.list}>
            {reviews.map((review) => (
              <article key={review.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <a href={`/games/${encodeURIComponent(review.gameTitle)}`} className={styles.gameTitle}>
                      {review.gameTitle}
                    </a>
                    <p className={styles.meta}>
                      {review.platform} · {review.playtime} played ·{' '}
                      <a href={`/profile/${encodeURIComponent(review.reviewerTag)}`} className={styles.reviewer}>
                        {review.reviewerTag}
                      </a>
                    </p>
                  </div>
                  <span
                    className={styles.rating}
                    style={{
                      color: review.rating >= 8 ? 'var(--neon)' : review.rating >= 5 ? 'var(--yellow)' : 'var(--red)',
                    }}
                  >
                    {review.rating}<span className={styles.ratingDenom}>/10</span>
                  </span>
                </div>
                <a href={`/reviews/${review.id}`} className={styles.headline}>
                  "{review.headline}"
                </a>
                <p className={styles.body}>{review.body}</p>
                <div className={styles.footer}>
                  <time className={styles.time}>
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </time>
                  <a href={`/reviews/${review.id}`} className={styles.readMore}>Read full review →</a>
                </div>
              </article>
            ))}
          </div>

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
        </>
      )}
    </main>
  );
}
