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

export async function sendFollowEmail(toEmail: string, followerTag: string): Promise<void> {
  if (!ready()) return;
  await client().emails.send({
    from:    'Gamers Feedback <notifications@gamersfeedback.app>',
    to:      toEmail,
    subject: `${followerTag} is now following you`,
    html: `
      <h2>New Follower</h2>
      <p><strong>${followerTag}</strong> started following you on Gamers Feedback.</p>
      <p><a href="${baseUrl()}/profile/${encodeURIComponent(followerTag)}">View their profile →</a></p>
    `,
  });
}

export async function sendVoteEmail(
  toEmail: string,
  voterTag: string,
  gameTitle: string,
  type: 'up' | 'down',
): Promise<void> {
  if (!ready()) return;
  const icon = type === 'up' ? '👍' : '👎';
  const label = type === 'up' ? 'upvoted' : 'downvoted';
  await client().emails.send({
    from:    'Gamers Feedback <notifications@gamersfeedback.app>',
    to:      toEmail,
    subject: `${icon} ${voterTag} ${label} your review of ${gameTitle}`,
    html: `
      <h2>Vote on Your Review</h2>
      <p><strong>${voterTag}</strong> ${label} your review of <strong>${gameTitle}</strong>.</p>
      <p><a href="${baseUrl()}">See your reviews →</a></p>
    `,
  });
}

export async function sendReclassifyEmail(
  toEmail: string,
  gameTitle: string,
  classification: string,
): Promise<void> {
  if (!ready()) return;
  await client().emails.send({
    from:    'Gamers Feedback <notifications@gamersfeedback.app>',
    to:      toEmail,
    subject: `Your review of ${gameTitle} was reclassified`,
    html: `
      <h2>Review Update</h2>
      <p>A moderator reclassified your review of <strong>${gameTitle}</strong>
      as <strong>${classification}</strong>.</p>
      <p><a href="${baseUrl()}/my-reviews">View your reviews →</a></p>
    `,
  });
}

export async function sendDigestEmail(
  toEmail: string,
  gamerTag: string,
  data: { newFollowers: number; upvotes: number; downvotes: number; totalReviews: number },
): Promise<void> {
  if (!ready()) return;
  await client().emails.send({
    from:    'Gamers Feedback <digest@gamersfeedback.app>',
    to:      toEmail,
    subject: `Your Weekly Digest — Gamers' Feedback`,
    html: `
      <h2>Weekly Digest for ${gamerTag}</h2>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #222;">New followers this week</td>
          <td style="padding:12px 0;border-bottom:1px solid #222;text-align:right;font-weight:700;">${data.newFollowers}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #222;">👍 Upvotes on your reviews</td>
          <td style="padding:12px 0;border-bottom:1px solid #222;text-align:right;font-weight:700;">${data.upvotes}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #222;">👎 Downvotes on your reviews</td>
          <td style="padding:12px 0;border-bottom:1px solid #222;text-align:right;font-weight:700;">${data.downvotes}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;">Total reviews written</td>
          <td style="padding:12px 0;text-align:right;font-weight:700;">${data.totalReviews}</td>
        </tr>
      </table>
      <p style="margin-top:24px;">
        <a href="${baseUrl()}/profile/${encodeURIComponent(gamerTag)}">View your profile →</a>
      </p>
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
