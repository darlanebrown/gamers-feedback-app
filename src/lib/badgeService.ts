import { prisma } from './prisma';

export type Badge = {
  id:          string;
  label:       string;
  description: string;
};

export const BADGES: Record<string, Badge> = {
  first_review: {
    id:          'first_review',
    label:       '🎮 First Review',
    description: 'Submitted your first review',
  },
  prolific: {
    id:          'prolific',
    label:       '✍️ Prolific',
    description: 'Submitted 10 or more reviews',
  },
  verified_voice: {
    id:          'verified_voice',
    label:       '✅ Verified Voice',
    description: '5 or more helpful reviews',
  },
  crowd_favorite: {
    id:          'crowd_favorite',
    label:       '❤️ Crowd Favorite',
    description: '10 or more upvotes across your reviews',
  },
  social_butterfly: {
    id:          'social_butterfly',
    label:       '👥 Social Butterfly',
    description: '5 or more followers',
  },
};

export async function getUserBadges(gamerTag: string): Promise<Badge[]> {
  const [totalReviews, helpfulReviews, upvotes, followers] = await Promise.all([
    prisma.review.count({ where: { reviewerTag: gamerTag } }),
    prisma.review.count({ where: { reviewerTag: gamerTag, classification: 'helpful' } }),
    prisma.reviewVote.count({ where: { review: { reviewerTag: gamerTag }, type: 'up' } }),
    prisma.follow.count({ where: { followingTag: gamerTag } }),
  ]);

  const earned: Badge[] = [];

  if (totalReviews >= 1)  earned.push(BADGES.first_review);
  if (totalReviews >= 10) earned.push(BADGES.prolific);
  if (helpfulReviews >= 5) earned.push(BADGES.verified_voice);
  if (upvotes >= 10)      earned.push(BADGES.crowd_favorite);
  if (followers >= 5)     earned.push(BADGES.social_butterfly);

  return earned;
}
