'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './review-page.module.css';

type Field = { headline: string; body: string; pros: string; cons: string; rating: number; playtime: string };

export default function ReviewActions({ reviewId, initial }: {
  reviewId: string;
  initial: Field;
}) {
  const router = useRouter();
  const [mode, setMode]       = useState<'idle' | 'editing' | 'deleting'>('idle');
  const [form, setForm]       = useState<Field>(initial);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const set = (k: keyof Field) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rating: Number(form.rating) }),
    });
    setSaving(false);
    if (!res.ok) { setError('Could not save. Please try again.'); return; }
    setMode('idle');
    router.refresh();
  };

  const handleDelete = async () => {
    setSaving(true);
    const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
    setSaving(false);
    if (!res.ok) { setError('Could not delete. Please try again.'); return; }
    router.push('/');
  };

  if (mode === 'editing') {
    return (
      <form onSubmit={handleSave} className={styles.editForm}>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Headline</label>
          <input className={styles.editInput} value={form.headline} onChange={set('headline')} required maxLength={120} />
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Rating: <strong style={{ color: 'var(--neon)' }}>{form.rating}/10</strong></label>
          <input type="range" min={1} max={10} step={1} value={form.rating}
            onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
            className={styles.editSlider} />
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Review</label>
          <textarea className={styles.editTextarea} value={form.body} onChange={set('body')} required rows={4} />
        </div>
        <div className={styles.editRow}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Pros</label>
            <textarea className={styles.editTextarea} value={form.pros} onChange={set('pros')} rows={2} />
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Cons</label>
            <textarea className={styles.editTextarea} value={form.cons} onChange={set('cons')} rows={2} />
          </div>
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Hours played</label>
          <input className={styles.editInput} value={form.playtime} onChange={set('playtime')} />
        </div>
        {error && <p className={styles.editError}>{error}</p>}
        <div className={styles.editActions}>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'deleting') {
    return (
      <div className={styles.deleteConfirm}>
        <p className={styles.deleteWarning}>Delete this review permanently? This cannot be undone.</p>
        {error && <p className={styles.editError}>{error}</p>}
        <div className={styles.editActions}>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={saving}>
            {saving ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button className={styles.cancelBtn} onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.ownerActions}>
      <button className={styles.editBtn} onClick={() => setMode('editing')}>Edit Review</button>
      <button className={styles.deleteBtn} onClick={() => setMode('deleting')}>Delete</button>
    </div>
  );
}
