'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Review } from '@/types';
import styles from './search.module.css';

const PLATFORMS = ['', 'PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'Steam Deck', 'Mobile'];
const SORTS = [
  { value: 'newest',  label: 'Newest' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest',  label: 'Lowest Rated' },
];

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [q,        setQ]        = useState(params.get('q')        ?? '');
  const [platform, setPlatform] = useState(params.get('platform') ?? '');
  const [minRating, setMinRating] = useState(params.get('minRating') ?? '');
  const [maxRating, setMaxRating] = useState(params.get('maxRating') ?? '');
  const [sort,     setSort]     = useState(params.get('sort')     ?? 'newest');
  const [page,     setPage]     = useState(parseInt(params.get('page') ?? '1', 10));

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const buildQuery = useCallback((overrides: Record<string, string | number> = {}) => {
    const p: Record<string, string> = {};
    const vals = { q, platform, minRating, maxRating, sort, page, ...overrides };
    if (vals.q)        p.q        = String(vals.q);
    if (vals.platform) p.platform = String(vals.platform);
    if (vals.minRating) p.minRating = String(vals.minRating);
    if (vals.maxRating) p.maxRating = String(vals.maxRating);
    p.sort = String(vals.sort);
    p.page = String(vals.page);
    return p;
  }, [q, platform, minRating, maxRating, sort, page]);

  const runSearch = useCallback(async (overrides: Record<string, string | number> = {}) => {
    setLoading(true);
    const p = buildQuery(overrides);
    const qs = new URLSearchParams(p).toString();
    router.replace(`/search?${qs}`, { scroll: false });
    const res = await fetch(`/api/search?${qs}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setReviews(d.reviews ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, [buildQuery, router]);

  // Run on initial mount from URL params
  useEffect(() => { runSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = () => { setPage(1); runSearch({ page: 1 }); };

  const goPage = (n: number) => { setPage(n); runSearch({ page: n }); };

  const ratingColor = (r: number) =>
    r >= 8 ? 'var(--neon)' : r >= 5 ? 'var(--yellow)' : 'var(--red)';

  const totalPages = Math.ceil(total / limit);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/" className={styles.navLink}>← Reviews</a>
        <span className={styles.sep}>/</span>
        <span style={{ color: 'var(--text-muted)' }}>Search</span>
      </nav>

      <h1 className={styles.title}>Search Reviews</h1>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          placeholder="Keyword, game, or reviewer…"
        />

        <select className={styles.select} value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p || 'All Platforms'}</option>
          ))}
        </select>

        <div className={styles.ratingRange}>
          <input
            className={styles.ratingInput} type="number" min={1} max={10} placeholder="Min"
            value={minRating} onChange={(e) => setMinRating(e.target.value)}
          />
          <span className={styles.rangeSep}>–</span>
          <input
            className={styles.ratingInput} type="number" min={1} max={10} placeholder="Max"
            value={maxRating} onChange={(e) => setMaxRating(e.target.value)}
          />
        </div>

        <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button className={styles.searchBtn} onClick={handleFilter} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* ── Results header ── */}
      {!loading && (
        <p className={styles.resultsMeta}>
          {total === 0 ? 'No results' : `${total} result${total !== 1 ? 's' : ''}${total > limit ? ` · page ${page} of ${totalPages}` : ''}`}
        </p>
      )}

      {/* ── Results ── */}
      <div className={styles.results}>
        {reviews.map((r) => (
          <a key={r.id} href={`/reviews/${r.id}`} className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <a
                  href={`/games/${encodeURIComponent(r.gameTitle)}`}
                  className={styles.gameTitle}
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.gameTitle}
                </a>
                <p className={styles.cardMeta}>
                  {r.platform} · {r.playtime} played ·{' '}
                  <a
                    href={`/profile/${encodeURIComponent(r.reviewerTag)}`}
                    className={styles.reviewer}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.reviewerTag}
                  </a>
                </p>
              </div>
              <span className={styles.rating} style={{ color: ratingColor(r.rating) }}>
                {r.rating}/10
              </span>
            </div>
            <p className={styles.headline}>"{r.headline}"</p>
            <p className={styles.body}>{r.body.slice(0, 160)}{r.body.length > 160 ? '…' : ''}</p>
          </a>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => goPage(page - 1)} disabled={page <= 1}>
            ← Prev
          </button>
          <span className={styles.pageInfo}>{page} / {totalPages}</span>
          <button className={styles.pageBtn} onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
