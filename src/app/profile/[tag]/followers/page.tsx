'use client';

import { useEffect, useState } from 'react';
import styles from '../follow-list.module.css';
import NotificationBell from '@/app/components/NotificationBell';

export default function FollowersPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const [tags, setTags]         = useState<string[]>([]);
  const [total, setTotal]       = useState(0);
  const [viewerTag, setViewerTag] = useState<string | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(tag)}/followers`)
      .then((r) => r.json())
      .then((d) => {
        setTags(d.followers ?? []);
        setTotal(d.total ?? 0);
        setViewerTag(d.viewerTag);
      })
      .finally(() => setLoading(false));
  }, [tag]);

  useEffect(() => {
    if (!viewerTag) return;
    fetch(`/api/profile/${encodeURIComponent(viewerTag)}/following`)
      .then((r) => r.json())
      .then((d) => setFollowing(new Set(d.following ?? [])));
  }, [viewerTag]);

  const toggle = async (target: string) => {
    const isNow = following.has(target);
    await fetch(`/api/profile/${encodeURIComponent(target)}/follow`, {
      method: isNow ? 'DELETE' : 'POST',
    });
    setFollowing((prev) => {
      const next = new Set(prev);
      isNow ? next.delete(target) : next.add(target);
      return next;
    });
  };

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <a href={`/profile/${encodeURIComponent(tag)}`} className={styles.navLink}>
            ← {tag}
          </a>
        </div>
        <NotificationBell />
      </nav>

      <header className={styles.header}>
        <p className={styles.eyebrow}>Social</p>
        <h1 className={styles.title}>Followers</h1>
        {!loading && <p className={styles.subtitle}>{total} {total === 1 ? 'person follows' : 'people follow'} {tag}</p>}
      </header>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : tags.length === 0 ? (
        <div className={styles.empty}>No followers yet.</div>
      ) : (
        <ul className={styles.list}>
          {tags.map((t) => (
            <li key={t} className={styles.item}>
              <a href={`/profile/${encodeURIComponent(t)}`} className={styles.itemTag}>{t}</a>
              {viewerTag && viewerTag !== t && (
                <button
                  className={`${styles.followBtn} ${following.has(t) ? styles.followBtnActive : ''}`}
                  onClick={() => toggle(t)}
                >
                  {following.has(t) ? 'Following' : '+ Follow'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
