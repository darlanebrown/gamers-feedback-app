import { createNotification } from './notificationStore';
import { getPreferences }     from './notificationPrefStore';

export async function notifyVoteOnReview(
  reviewerTag: string,
  voterTag:    string,
  reviewId:    string,
  gameTitle:   string,
  type:        'up' | 'down',
): Promise<void> {
  const prefs = await getPreferences(reviewerTag);
  if (!prefs.voteOnReview) return;
  await createNotification(
    reviewerTag,
    type === 'up' ? 'vote_up' : 'vote_down',
    voterTag,
    reviewId,
    gameTitle,
  );
}
