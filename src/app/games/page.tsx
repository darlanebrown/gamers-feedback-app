'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './games.module.css';

type ReviewedGame = { gameTitle: string; avgRating: number; reviewCount: number };

const PAGE_SIZE = 24;

export default function GamesPage() {
  const [games, setGames]       = useState<ReviewedGame[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState<'reviews' | 'rating'>('reviews');
  const [offset, setOffset]     = useState(0);
  const [hasMore, setHasMore]   = useState(false);

  const fetchGames = useCallback(async (off: number, s: string, sortBy: 'reviews' | 'rating') => {
    setLoading(true);
    const params = new URLSearchParams({
      sort:   sortBy,
      limit:  String(PAGE_SIZE + 1), // fetch one extra to detect hasMore
      offset: String(off),
    });
    const res = await fetch(`/api/games?${params}`).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      const all: ReviewedGame[] = data.games ?? [];
      setHasMore(all.length > PAGE_SIZE);
      setGames(all.slice(0, PAGE_SIZE));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGames(0, search, sort);
    setOffset(0);
  }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      fetchGames(0, search, sort);
    }, 250);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = () => {
    const newOff = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOff);
    fetchGames(newOff, search, sort);
  };

  const next = () => {
    const newOff = offset + PAGE_SIZE;
    setOffset(newOff);
    fetchGames(newOff, search, sort);
  };

  const filtered = search.trim()
    ? games.filter((g) => g.gameTitle.toLowerCase().includes(search.toLowerCase()))
    : games;

  return (
    <main className={styles.page}>
      <a href="/" className={styles.backLink}>← Back to Reviews</a>

      <div className={styles.header}>
        <p className={styles.eyebrow}>Gamers' Feedback · Community Reviewed</p>
        <h1 className={styles.title}>Browse Games</h1>
        <p className={styles.subtitle}>
          {loading ? 'Loading…' : `${filtered.length}+ verified-review titles`}
        </p>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Filter by game name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as 'reviews' | 'rating')}
        >
          <option value="reviews">Most Reviewed</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading games…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No games found.</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((g) => {
            const color = g.avgRating >= 8 ? 'var(--neon)' : g.avgRating >= 5 ? 'var(--yellow)' : 'var(--red)';
            return (
              <a
                key={g.gameTitle}
                href={`/games/${encodeURIComponent(g.gameTitle)}`}
                className={styles.card}
              >
                <span className={styles.cardTitle}>{g.gameTitle}</span>
                <div className={styles.cardMeta}>
                  <span className={styles.cardRating} style={{ color }}>
                    {g.avgRating > 0 ? `${g.avgRating.toFixed(1)}/10` : '—'}
                  </span>
                  <span className={styles.cardCount}>
                    {g.reviewCount} review{g.reviewCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {!loading && !search && (offset > 0 || hasMore) && (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageBtn} ${offset === 0 ? styles.pageBtnDisabled : ''}`}
            onClick={prev}
            disabled={offset === 0}
          >
            ← Previous
          </button>
          <button
            className={`${styles.pageBtn} ${!hasMore ? styles.pageBtnDisabled : ''}`}
            onClick={next}
            disabled={!hasMore}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
