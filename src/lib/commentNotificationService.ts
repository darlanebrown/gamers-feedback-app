import { getPreferences }    from './notificationPrefStore';
import { createNotification } from './notificationStore';

export async function notifyCommentOnReview(
  reviewerTag:  string,
  commenterTag: string,
  reviewId:     string,
  gameTitle:    string,
): Promise<void> {
  const prefs = await getPreferences(reviewerTag);
  if (!prefs.commentOnReview) return;
  await createNotification(reviewerTag, 'comment', commenterTag, reviewId, gameTitle);
}

export async function notifyReplyToComment(
  commentAuthorTag: string,
  replierTag:       string,
  reviewId:         string,
): Promise<void> {
  const prefs = await getPreferences(commentAuthorTag);
  if (!prefs.replyToComment) return;
  await createNotification(commentAuthorTag, 'reply', replierTag, reviewId);
}
