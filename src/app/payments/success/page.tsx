'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './success.module.css';

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🫙</div>
        <h1 className={styles.title}>Tip Sent!</h1>
        <p className={styles.body}>
          Your tip is on its way. Thanks for supporting a fellow gamer.
        </p>
        {sessionId && (
          <p className={styles.ref}>Ref: {sessionId.slice(-8)}</p>
        )}
        <a href="/" className={styles.homeBtn}>← Back to reviews</a>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
