import { Resend } from 'resend';

function client(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

function ready(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.MODERATOR_EMAIL);
}

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? '';

export async function sendBombingEmail(gameTitle: string, count: number): Promise<void> {
  if (!ready()) return;
  await client().emails.send({
    from:    'Gamers Feedback <alerts@gamersfeedback.app>',
    to:      process.env.MODERATOR_EMAIL!,
    subject: `🚨 Review Bombing Detected: ${gameTitle}`,
    html: `
      <h2>Review Bombing Alert</h2>
      <p><strong>${count} low-rated reviews</strong> were submitted for
      <strong>${gameTitle}</strong> in the last hour.</p>
      <p><a href="${baseUrl()}/admin">View in Admin Panel →</a></p>
    `,
  });
}

export async function sendClassificationEmail(
  reviewId: string,
  gameTitle: string,
  reviewerTag: string,
  classification: 'spam' | 'toxic',
): Promise<void> {
  if (!ready()) return;
  const label = classification === 'toxic' ? '⚠️ Toxic' : '🚫 Spam';
  await client().emails.send({
    from:    'Gamers Feedback <alerts@gamersfeedback.app>',
    to:      process.env.MODERATOR_EMAIL!,
    subject: `${label} Review Flagged — ${gameTitle}`,
    html: `
      <h2>${label} Review Flagged</h2>
      <p>A review by <strong>${reviewerTag}</strong> on
      <strong>${gameTitle}</strong> was classified as <strong>${classification}</strong>.</p>
      <p>
        <a href="${baseUrl()}/reviews/${reviewId}">View Review →</a> &nbsp;|&nbsp;
        <a href="${baseUrl()}/admin">Admin Panel →</a>
      </p>
    `,
  });
}
