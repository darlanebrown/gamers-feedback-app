'use client';

import { useState } from 'react';
import styles from './review-page.module.css';

export default function ShareButton({ reviewId }: { reviewId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/reviews/${reviewId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={`${styles.shareBtn} ${copied ? styles.shareBtnCopied : ''}`} onClick={handleCopy}>
      {copied ? 'Copied!' : '⎘ Copy link'}
    </button>
  );
}
