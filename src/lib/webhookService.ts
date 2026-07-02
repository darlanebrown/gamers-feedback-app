const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? '';

async function post(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.MODERATOR_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

export async function sendBombingWebhook(gameTitle: string, count: number): Promise<void> {
  await post({
    type:      'review_bombing',
    gameTitle,
    count,
    message:   `🚨 Review bombing detected on "${gameTitle}": ${count} low-rated reviews in the last hour`,
    adminUrl:  `${baseUrl()}/admin`,
  });
}

export async function sendFlagWebhook(
  reviewId: string,
  gameTitle: string,
  reviewerTag: string,
  reporterTag: string,
): Promise<void> {
  await post({
    type:        'review_flag',
    reviewId,
    gameTitle,
    reviewerTag,
    reporterTag,
    message:     `🚩 ${reporterTag} flagged a review by ${reviewerTag} on "${gameTitle}"`,
    reviewUrl:   `${baseUrl()}/reviews/${reviewId}`,
    adminUrl:    `${baseUrl()}/admin`,
  });
}

export async function sendCommentFlagWebhook(
  commentId: string,
  reviewId: string,
  authorTag: string,
  reporterTag: string,
): Promise<void> {
  await post({
    type:        'comment_flag',
    commentId,
    reviewId,
    authorTag,
    reporterTag,
    message:     `🚩 Comment by ${authorTag} flagged by ${reporterTag}`,
    reviewUrl:   `${baseUrl()}/reviews/${reviewId}`,
    adminUrl:    `${baseUrl()}/admin`,
  });
}

export async function sendClassificationWebhook(
  reviewId: string,
  gameTitle: string,
  reviewerTag: string,
  classification: 'spam' | 'toxic',
): Promise<void> {
  await post({
    type:          'classification_alert',
    classification,
    reviewId,
    gameTitle,
    reviewerTag,
    message:       `⚠️ ${classification} review by ${reviewerTag} on "${gameTitle}"`,
    reviewUrl:     `${baseUrl()}/reviews/${reviewId}`,
    adminUrl:      `${baseUrl()}/admin`,
  });
}
