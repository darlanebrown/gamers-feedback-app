import { prisma } from './prisma';

export interface ReputationBreakdown {
  helpfulReviews:  number;
  upvotesReceived: number;
  commentsPosted:  number;
  followersCount:  number;
}

export interface Reputation {
  score:     number;
  breakdown: ReputationBreakdown;
}

const WEIGHTS = {
  helpfulReview:  5,
  upvoteReceived: 2,
  commentPosted:  1,
  follower:       3,
};

export async function getUserReputation(gamerTag: string): Promise<Reputation> {
  const [helpfulReviews, upvotesReceived, commentsPosted, followersCount] = await Promise.all([
    prisma.review.count({ where: { reviewerTag: gamerTag, classification: 'helpful' } }),
    prisma.reviewVote.count({
      where: { type: 'up', review: { reviewerTag: gamerTag } },
    }),
    prisma.reviewComment.count({ where: { authorTag: gamerTag } }),
    prisma.follow.count({ where: { followingTag: gamerTag } }),
  ]);

  const score =
    helpfulReviews  * WEIGHTS.helpfulReview  +
    upvotesReceived * WEIGHTS.upvoteReceived +
    commentsPosted  * WEIGHTS.commentPosted  +
    followersCount  * WEIGHTS.follower;

  return {
    score,
    breakdown: { helpfulReviews, upvotesReceived, commentsPosted, followersCount },
  };
}
