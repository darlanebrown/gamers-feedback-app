import { findUserByTag }    from './userStore';
import { createNotification } from './notificationStore';
import { getPreferences }   from './notificationPrefStore';

export function extractMentions(body: string): string[] {
  const matches = body.match(/@([^\s@,!?]+)/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}

export async function notifyMentions(
  body: string,
  reviewId: string,
  actorTag: string,
): Promise<void> {
  const mentions = extractMentions(body).filter((tag) => tag !== actorTag);
  if (mentions.length === 0) return;

  await Promise.all(
    mentions.map(async (tag) => {
      const [user, prefs] = await Promise.all([
        findUserByTag(tag),
        getPreferences(tag),
      ]);
      if (user && prefs.mention) {
        await createNotification(tag, 'mention', actorTag, reviewId);
      }
    }),
  );
}
