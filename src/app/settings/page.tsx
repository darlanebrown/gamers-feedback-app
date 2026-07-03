'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';

type Tab = 'profile' | 'security' | 'notifications' | 'danger';

type NotifPrefs = {
  newFollower:     boolean;
  tipReceived:     boolean;
  commentOnReview: boolean;
  replyToComment:  boolean;
  mention:         boolean;
  newGameReview:   boolean;
  voteOnReview:    boolean;
  reclassify:      boolean;
};

type Me = {
  id: string;
  gamerTag: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  role: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [me, setMe] = useState<Me | null>(null);

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secMsg, setSecMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [secLoading, setSecLoading] = useState(false);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Danger
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { router.push('/'); return; }
        const u = d.user as Me;
        setMe(u);
        setDisplayName(u.displayName ?? '');
        setBio(u.bio ?? '');
        fetch('/api/users/me/notification-preferences')
          .then((r) => r.ok ? r.json() : null)
          .then((d) => d && setNotifPrefs(d.preferences))
          .catch(() => {});
      });
  }, [router]);

  const togglePref = async (key: keyof NotifPrefs) => {
    if (!notifPrefs || notifLoading) return;
    const newVal = !notifPrefs[key];
    setNotifLoading(true);
    setNotifMsg(null);
    const res = await fetch('/api/users/me/notification-preferences', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [key]: newVal }),
    });
    setNotifLoading(false);
    if (res.ok) {
      const d = await res.json();
      setNotifPrefs(d.preferences);
      setNotifMsg({ ok: true, text: 'Preferences saved.' });
    } else {
      setNotifMsg({ ok: false, text: 'Something went wrong.' });
    }
  };

  const saveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg(null);
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim() || null, bio: bio.trim() || null }),
    });
    setProfileLoading(false);
    if (res.ok) {
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } else {
      const d = await res.json();
      setProfileMsg({ ok: false, text: d.error ?? 'Something went wrong.' });
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSecMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setSecLoading(true);
    setSecMsg(null);
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSecLoading(false);
    if (res.ok) {
      setSecMsg({ ok: true, text: 'Password updated.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      const d = await res.json();
      setSecMsg({ ok: false, text: d.error ?? 'Something went wrong.' });
    }
  };

  const deleteAccount = async () => {
    if (!me || deleteConfirm !== me.gamerTag) return;
    setDeleteLoading(true);
    const res = await fetch('/api/auth/me', { method: 'DELETE' });
    setDeleteLoading(false);
    if (res.ok) {
      setDeleteMsg({ ok: true, text: 'Account deleted. Redirecting…' });
      setTimeout(() => router.push('/'), 1500);
    } else {
      setDeleteMsg({ ok: false, text: 'Something went wrong.' });
    }
  };

  if (!me) return <div className={styles.loading}>Loading…</div>;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>
      <p className={styles.subheading}>{me.gamerTag}</p>

      <div className={styles.tabs}>
        {(['profile', 'security', 'notifications', 'danger'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''} ${t === 'danger' ? styles.tabDanger : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'profile' ? 'Profile' : t === 'security' ? 'Security' : t === 'notifications' ? 'Notifications' : 'Danger Zone'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <section className={styles.section}>
          <label className={styles.label}>
            Display Name
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={me.gamerTag}
              maxLength={40}
            />
          </label>
          <label className={styles.label}>
            Bio
            <textarea
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself…"
              maxLength={200}
              rows={3}
            />
          </label>
          {profileMsg && (
            <p className={profileMsg.ok ? styles.msgOk : styles.msgErr}>{profileMsg.text}</p>
          )}
          <button className={styles.btn} onClick={saveProfile} disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save Profile'}
          </button>
        </section>
      )}

      {tab === 'security' && (
        <section className={styles.section}>
          <label className={styles.label}>
            Current Password
            <input
              className={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className={styles.label}>
            New Password
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>
          <label className={styles.label}>
            Confirm New Password
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {secMsg && (
            <p className={secMsg.ok ? styles.msgOk : styles.msgErr}>{secMsg.text}</p>
          )}
          <button
            className={styles.btn}
            onClick={changePassword}
            disabled={secLoading || !currentPassword || !newPassword || !confirmPassword}
          >
            {secLoading ? 'Updating…' : 'Update Password'}
          </button>
        </section>
      )}

      {tab === 'notifications' && (
        <section className={styles.section}>
          {!notifPrefs ? (
            <p className={styles.loading}>Loading…</p>
          ) : (
            <>
              {([
                { key: 'newFollower',     label: 'New follower',            desc: 'When someone follows you' },
                { key: 'tipReceived',     label: 'Tip received',            desc: 'When someone tips you' },
                { key: 'voteOnReview',    label: 'Vote on your review',     desc: 'When someone upvotes or downvotes your review' },
                { key: 'commentOnReview', label: 'Comment on your review',  desc: 'When someone comments on your review' },
                { key: 'replyToComment',  label: 'Reply to your comment',   desc: 'When someone replies to your comment' },
                { key: 'mention',         label: 'Mention',                 desc: 'When someone @mentions you' },
                { key: 'newGameReview',   label: 'New review for a game',   desc: 'When someone reviews a game you follow' },
                { key: 'reclassify',      label: 'Review reclassified',     desc: 'When an admin changes your review\'s classification' },
              ] as { key: keyof NotifPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <div key={key} className={styles.notifRow}>
                  <div>
                    <p className={styles.notifLabel}>{label}</p>
                    <p className={styles.notifDesc}>{desc}</p>
                  </div>
                  <button
                    className={`${styles.toggle} ${notifPrefs[key] ? styles.toggleOn : ''}`}
                    onClick={() => togglePref(key)}
                    disabled={notifLoading}
                    aria-label={`${notifPrefs[key] ? 'Disable' : 'Enable'} ${label}`}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              ))}
              {notifMsg && (
                <p className={notifMsg.ok ? styles.msgOk : styles.msgErr}>{notifMsg.text}</p>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'danger' && (
        <section className={styles.section}>
          <div className={styles.dangerBox}>
            <h2 className={styles.dangerHeading}>Delete Account</h2>
            <p className={styles.dangerDesc}>
              This permanently anonymizes your account. Your reviews stay but your profile,
              email, and password will be erased. This cannot be undone.
            </p>
            <label className={styles.label}>
              Type your gamer tag <strong>{me.gamerTag}</strong> to confirm
              <input
                className={styles.input}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={me.gamerTag}
              />
            </label>
            {deleteMsg && (
              <p className={deleteMsg.ok ? styles.msgOk : styles.msgErr}>{deleteMsg.text}</p>
            )}
            <button
              className={styles.btnDanger}
              onClick={deleteAccount}
              disabled={deleteLoading || deleteConfirm !== me.gamerTag}
            >
              {deleteLoading ? 'Deleting…' : 'Delete My Account'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
