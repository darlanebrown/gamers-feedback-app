'use client';

import { useEffect, useState } from 'react';
import styles from './review-page.module.css';

type Votes = { up: number; down: number };

export default function VoteBar({ reviewId, isLoggedIn }: {
  reviewId:   string;
  isLoggedIn: boolean;
}) {
  const [votes, setVotes]       = useState<Votes | null>(null);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/${reviewId}/vote`)
      .then((r) => r.json())
      .then((d) => { setVotes(d.votes); setUserVote(d.userVote ?? null); })
      .catch(() => {});
  }, [reviewId]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!isLoggedIn || loading) return;
    setLoading(true);
    if (userVote === type) {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, { method: 'DELETE' });
      if (res.ok) { const d = await res.json(); setVotes(d.votes); setUserVote(null); }
    } else {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) { const d = await res.json(); setVotes(d.votes); setUserVote(type); }
    }
    setLoading(false);
  };

  if (!votes) return null;

  const tooltip = isLoggedIn ? undefined : 'Sign in to vote';

  return (
    <div className={styles.voteBar}>
      <button
        className={`${styles.voteBarBtn} ${userVote === 'up' ? styles.voteBarBtnUp : ''}`}
        onClick={() => handleVote('up')}
        disabled={loading || !isLoggedIn}
        title={tooltip}
      >
        ▲ {votes.up}
      </button>
      <button
        className={`${styles.voteBarBtn} ${styles.voteBarBtnDownBase} ${userVote === 'down' ? styles.voteBarBtnDown : ''}`}
        onClick={() => handleVote('down')}
        disabled={loading || !isLoggedIn}
        title={tooltip}
      >
        ▼ {votes.down}
      </button>
    </div>
  );
}
