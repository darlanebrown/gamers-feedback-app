'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './leaderboard.module.css';

type TopReviewer = { reviewerTag: string; reviewCount: number; reputation: number };
type TopGame     = { gameTitle: string; avgRating: number; reviewCount: number };
type Period      = 'weekly' | 'monthly' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  weekly:  'This Week',
  monthly: 'This Month',
  all:     'All Time',
};

export default function LeaderboardPage() {
  const [topReviewers, setTopReviewers] = useState<TopReviewer[]>([]);
  const [topGames, setTopGames]         = useState<TopGame[]>([]);
  const [period, setPeriod]             = useState<Period>('all');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setTopReviewers(d.topReviewers ?? []);
        setTopGames(d.topGames ?? []);
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/" className={styles.navLink}>← Reviews</a>
      </nav>

      <div className={styles.header}>
        <p className={styles.eyebrow}>Community</p>
        <h1 className={styles.title}>Leaderboard</h1>
        <p className={styles.subtitle}>Top reviewers by reputation · Top games by avg helpful rating</p>
      </div>

      {/* ── Period tabs ── */}
      <div className={styles.periodTabs}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            className={`${styles.periodTab} ${period === p ? styles.periodTabActive : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🏆</span>
              <span className={styles.sectionTitle}>Top Reviewers</span>
            </div>
            <div className={styles.list}>
              {topReviewers.length === 0 ? (
                <div className={styles.empty}>No reviewers in this period.</div>
              ) : (
                topReviewers.map((r, i) => (
                  <Link
                    key={r.reviewerTag}
                    href={`/profile/${encodeURIComponent(r.reviewerTag)}`}
                    className={styles.item}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className={`${styles.rank}${i < 3 ? ` ${styles.top3}` : ''}`}>
                      {i + 1}
                    </span>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{r.reviewerTag}</div>
                      <div className={styles.itemMeta}>{r.reviewCount} review{r.reviewCount !== 1 ? 's' : ''}</div>
                    </div>
                    <span className={styles.score} title="Reputation (upvotes − downvotes)">
                      {r.reputation > 0 ? '+' : ''}{r.reputation}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🎮</span>
              <span className={styles.sectionTitle}>Top Rated Games</span>
            </div>
            <div className={styles.list}>
              {topGames.length === 0 ? (
                <div className={styles.empty}>No games reviewed in this period.</div>
              ) : (
                topGames.map((g, i) => (
                  <Link
                    key={g.gameTitle}
                    href={`/games/${encodeURIComponent(g.gameTitle)}`}
                    className={styles.item}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className={`${styles.rank}${i < 3 ? ` ${styles.top3}` : ''}`}>
                      {i + 1}
                    </span>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{g.gameTitle}</div>
                      <div className={styles.itemMeta}>{g.reviewCount} helpful review{g.reviewCount !== 1 ? 's' : ''}</div>
                    </div>
                    <span className={styles.score}>{g.avgRating.toFixed(1)}</span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
