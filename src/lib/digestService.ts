import { prisma } from './prisma';
import { sendDigestEmail } from './emailService';

export type DigestData = {
  newFollowers: number;
  upvotes:      number;
  downvotes:    number;
  totalReviews: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserDigestData(gamerTag: string): Promise<DigestData> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS);

  const [newFollowers, upvotes, downvotes, totalReviews] = await Promise.all([
    prisma.follow.count({
      where: { followingTag: gamerTag, createdAt: { gte: since } },
    }),
    prisma.reviewVote.count({
      where: { review: { reviewerTag: gamerTag }, type: 'up', createdAt: { gte: since } },
    }),
    prisma.reviewVote.count({
      where: { review: { reviewerTag: gamerTag }, type: 'down', createdAt: { gte: since } },
    }),
    prisma.review.count({
      where: { reviewerTag: gamerTag },
    }),
  ]);

  return { newFollowers, upvotes, downvotes, totalReviews };
}

export function hasActivity(data: DigestData): boolean {
  return data.newFollowers > 0 || data.upvotes > 0 || data.downvotes > 0;
}

export interface DigestResult {
  sent:    number;
  skipped: number;
}

export async function runWeeklyDigest(): Promise<DigestResult> {
  const optedOut = await prisma.emailPreference.findMany({
    where: { type: 'digest', enabled: false },
    select: { userId: true },
  });
  const optedOutIds = new Set(optedOut.map((r) => r.userId));

  const users = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true, email: true, gamerTag: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (optedOutIds.has(user.id)) {
      skipped++;
      continue;
    }

    const data = await getUserDigestData(user.gamerTag);
    sendDigestEmail(user.email, user.gamerTag, data).catch(() => {});
    sent++;
  }

  return { sent, skipped };
}
