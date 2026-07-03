jest.mock('@/lib/prisma', () => ({
  prisma: {
    review:      { count: jest.fn(), findMany: jest.fn() },
    reviewVote:  { count: jest.fn() },
    follow:      { count: jest.fn() },
  },
}));

import { getUserBadges, BADGES } from '@/lib/badgeService';
import { prisma } from '@/lib/prisma';

const mockReviewCount    = (prisma.review     as any).count    as jest.Mock;
const mockReviewFindMany = (prisma.review     as any).findMany as jest.Mock;
const mockVoteCount      = (prisma.reviewVote as any).count    as jest.Mock;
const mockFollowCount    = (prisma.follow     as any).count    as jest.Mock;

function setStats({
  totalReviews   = 0,
  helpfulReviews = 0,
  upvotes        = 0,
  followers      = 0,
} = {}) {
  mockReviewCount.mockImplementation(({ where }: any) => {
    if (where?.classification === 'helpful') return Promise.resolve(helpfulReviews);
    return Promise.resolve(totalReviews);
  });
  mockReviewFindMany.mockResolvedValue(
    (totalReviews > 0 || upvotes > 0) ? [{ id: 'r1' }] : [],
  );
  mockVoteCount.mockResolvedValue(upvotes);
  mockFollowCount.mockResolvedValue(followers);
}

beforeEach(() => jest.resetAllMocks());

describe('getUserBadges', () => {
  it('returns no badges for a brand-new user with no activity', async () => {
    setStats();
    const badges = await getUserBadges('New#1');
    expect(badges).toHaveLength(0);
  });

  it('awards first_review when user has at least 1 review', async () => {
    setStats({ totalReviews: 1 });
    const badges = await getUserBadges('Player#1');
    expect(badges.map((b) => b.id)).toContain('first_review');
  });

  it('awards prolific when user has 10 or more reviews', async () => {
    setStats({ totalReviews: 10 });
    const badges = await getUserBadges('Player#1');
    expect(badges.map((b) => b.id)).toContain('prolific');
  });

  it('does not award prolific when user has fewer than 10 reviews', async () => {
    setStats({ totalReviews: 9 });
    const badges = await getUserBadges('Player#1');
    expect(badges.map((b) => b.id)).not.toContain('prolific');
  });

  it('awards verified_voice when user has 5 or more helpful reviews', async () => {
    setStats({ totalReviews: 5, helpfulReviews: 5 });
    const badges = await getUserBadges('Player#1');
    expect(badges.map((b) => b.id)).toContain('verified_voice');
  });

  it('awards crowd_favorite when user has 10 or more upvotes', async () => {
    setStats({ totalReviews: 1, upvotes: 10 });
    const badges = await getUserBadges('Player#1');
    expect(badges.map((b) => b.id)).toContain('crowd_favorite');
  });

  it('awards social_butterfly when user has 5 or more followers', async () => {
    setStats({ totalReviews: 1, followers: 5 });
    const badges = await getUserBadges('Player#1');
    expect(badges.map((b) => b.id)).toContain('social_butterfly');
  });

  it('awards all badges when all thresholds are met', async () => {
    setStats({ totalReviews: 15, helpfulReviews: 10, upvotes: 20, followers: 8 });
    const badges = await getUserBadges('PowerUser#1');
    const ids = badges.map((b) => b.id);
    expect(ids).toContain('first_review');
    expect(ids).toContain('prolific');
    expect(ids).toContain('verified_voice');
    expect(ids).toContain('crowd_favorite');
    expect(ids).toContain('social_butterfly');
    expect(badges).toHaveLength(5);
  });

  it('each badge has id, label, and description fields', async () => {
    setStats({ totalReviews: 1 });
    const badges = await getUserBadges('Player#1');
    expect(badges[0]).toMatchObject({
      id:          expect.any(String),
      label:       expect.any(String),
      description: expect.any(String),
    });
  });
});

describe('BADGES constant', () => {
  it('exports definitions for all 5 badges', () => {
    expect(Object.keys(BADGES)).toEqual(
      expect.arrayContaining(['first_review', 'prolific', 'verified_voice', 'crowd_favorite', 'social_butterfly']),
    );
  });
});
