import { createNotification } from './notificationStore';
import { getPreferences }     from './notificationPrefStore';

export async function notifyReclassify(
  reviewerTag: string,
  reviewId:    string,
  gameTitle:   string,
): Promise<void> {
  const prefs = await getPreferences(reviewerTag);
  if (!prefs.reclassify) return;
  await createNotification(reviewerTag, 'reclassify', undefined, reviewId, gameTitle);
}
