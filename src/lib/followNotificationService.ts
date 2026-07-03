import { getPreferences }    from './notificationPrefStore';
import { createNotification } from './notificationStore';

export async function notifyNewFollower(
  followingTag: string,
  followerTag:  string,
): Promise<void> {
  const prefs = await getPreferences(followingTag);
  if (!prefs.newFollower) return;
  await createNotification(followingTag, 'follow', followerTag);
}
