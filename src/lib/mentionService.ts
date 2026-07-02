import { findUserByTag } from './userStore';
import { createNotification } from './notificationStore';

export function extractMentions(body: string): string[] {
  const matches = body.match(/@([^\s@,!?]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
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
      const user = await findUserByTag(tag);
      if (user) {
        await createNotification(tag, 'mention' as any, actorTag, reviewId);
      }
    }),
  );
}
