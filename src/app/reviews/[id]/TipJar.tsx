'use client';

import { useState } from 'react';
import styles from './review-page.module.css';

const PRESETS = [
  { label: '$3',  cents: 300  },
  { label: '$5',  cents: 500  },
  { label: '$10', cents: 1000 },
  { label: '$25', cents: 2500 },
];

export default function TipJar({
  recipientTag,
  isLoggedIn,
}: {
  recipientTag: string;
  isLoggedIn:   boolean;
}) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const handleTip = async (cents: number) => {
    if (!isLoggedIn || loading !== null) return;
    setLoading(cents);
    setError(null);
    try {
      const res = await fetch('/api/payments/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipientTag, amountCents: cents }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
      window.location.href = data.url;
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(null);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className={styles.tipJar}>
      <span className={styles.tipJarLabel}>🫙 Tip {recipientTag}</span>
      <div className={styles.tipJarBtns}>
        {PRESETS.map(({ label, cents }) => (
          <button
            key={cents}
            className={styles.tipBtn}
            onClick={() => handleTip(cents)}
            disabled={loading !== null}
          >
            {loading === cents ? '…' : label}
          </button>
        ))}
      </div>
      {error && <p className={styles.tipError}>{error}</p>}
    </div>
  );
}
