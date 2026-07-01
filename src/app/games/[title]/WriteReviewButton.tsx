'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './game-page.module.css';

const PLATFORMS = ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'Steam Deck', 'Mobile'];

type Field = {
  platform: string; rating: number; headline: string;
  body: string; pros: string; cons: string; playtime: string;
};

export default function WriteReviewButton({ gameTitle }: { gameTitle: string }) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [gamerTag, setGamerTag] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm] = useState<Field>({
    platform: 'PC', rating: 8, headline: '', body: '', pros: '', cons: '', playtime: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user?.gamerTag) { setLoggedIn(true); setGamerTag(d.user.gamerTag); }
        else setLoggedIn(false);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  const set = (k: keyof Field) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, gameTitle, rating: Number(form.rating), reviewerTag: gamerTag }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Could not submit. Please try again.');
      setSaving(false);
      return;
    }

    const { review } = await res.json();

    // fire-and-forget classification
    fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: review.id, headline: form.headline,
        body: form.body, pros: form.pros, cons: form.cons,
      }),
    }).catch(() => {});

    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <a href="/api/auth/login" className={styles.writeReviewBtn}>
        Sign in to Write a Review
      </a>
    );
  }

  return (
    <>
      <button className={styles.writeReviewBtn} onClick={() => setOpen(true)}>
        + Write a Review
      </button>

      {open && (
        <div className={styles.wrOverlay} onClick={() => setOpen(false)}>
          <div className={styles.wrModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.wrHeader}>
              <h2 className={styles.wrTitle}>Review: {gameTitle}</h2>
              <button className={styles.wrClose} onClick={() => setOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.wrForm}>
              <div className={styles.wrRow}>
                <div className={styles.wrField}>
                  <label className={styles.wrLabel}>Platform</label>
                  <select className={styles.wrSelect} value={form.platform} onChange={set('platform')}>
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.wrField}>
                  <label className={styles.wrLabel}>
                    Rating: <strong style={{ color: 'var(--neon)' }}>{form.rating}/10</strong>
                  </label>
                  <input
                    type="range" min={1} max={10} step={1} value={form.rating}
                    onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                    className={styles.wrSlider}
                  />
                </div>
              </div>

              <div className={styles.wrField}>
                <label className={styles.wrLabel}>Headline</label>
                <input
                  className={styles.wrInput} value={form.headline} onChange={set('headline')}
                  placeholder="Sum up your experience…" required maxLength={120}
                />
              </div>

              <div className={styles.wrField}>
                <label className={styles.wrLabel}>Review</label>
                <textarea
                  className={styles.wrTextarea} value={form.body} onChange={set('body')}
                  placeholder="Share your thoughts…" required rows={4}
                />
              </div>

              <div className={styles.wrRow}>
                <div className={styles.wrField}>
                  <label className={styles.wrLabel}>Pros</label>
                  <textarea className={styles.wrTextarea} value={form.pros} onChange={set('pros')} rows={2} />
                </div>
                <div className={styles.wrField}>
                  <label className={styles.wrLabel}>Cons</label>
                  <textarea className={styles.wrTextarea} value={form.cons} onChange={set('cons')} rows={2} />
                </div>
              </div>

              <div className={styles.wrField}>
                <label className={styles.wrLabel}>Hours played</label>
                <input
                  className={styles.wrInput} value={form.playtime} onChange={set('playtime')}
                  placeholder="e.g. 40h"
                />
              </div>

              {error && <p className={styles.wrError}>{error}</p>}

              <div className={styles.wrActions}>
                <button type="submit" className={styles.wrSubmit} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Review'}
                </button>
                <button type="button" className={styles.wrCancel} onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
