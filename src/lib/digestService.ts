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

  const [newFollowers, totalReviews, reviewIds] = await Promise.all([
    prisma.follow.count({ where: { followingTag: gamerTag, createdAt: { gte: since } } }),
    prisma.review.count({ where: { reviewerTag: gamerTag } }),
    prisma.review.findMany({ where: { reviewerTag: gamerTag }, select: { id: true } })
      .then((rs) => rs.map((r) => r.id as string)),
  ]);
  const [upvotes, downvotes] = reviewIds.length > 0
    ? await Promise.all([
        prisma.reviewVote.count({ where: { reviewId: { in: reviewIds }, type: 'up', createdAt: { gte: since } } }),
        prisma.reviewVote.count({ where: { reviewId: { in: reviewIds }, type: 'down', createdAt: { gte: since } } }),
      ])
    : [0, 0];

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
