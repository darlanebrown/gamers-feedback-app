jest.mock('@/lib/reputationService', () => ({
  getUserReputation: jest.fn(),
}));

jest.mock('@/lib/userStore', () => ({
  getUserByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/reputation/route';
import { getUserReputation } from '@/lib/reputationService';
import { getUserByTag } from '@/lib/userStore';

const mockGetReputation = getUserReputation as jest.Mock;
const mockGetUserByTag  = getUserByTag      as jest.Mock;

const SAMPLE_USER = { id: 'u1', gamerTag: 'Gamer#1', banned: false };

const SAMPLE_REPUTATION = {
  score:        47,
  breakdown: {
    helpfulReviews: 5,
    upvotesReceived: 22,
    commentsPosted: 10,
    followersCount: 10,
  },
};

function makeReq(tag: string) {
  return new NextRequest(
    `http://localhost/api/profile/${encodeURIComponent(tag)}/reputation`,
  );
}

function makeParams(tag: string) {
  return Promise.resolve({ tag });
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/profile/[tag]/reputation', () => {
  it('returns 404 when user does not exist', async () => {
    mockGetUserByTag.mockResolvedValue(null);
    const res = await GET(makeReq('Ghost#9'), { params: makeParams('Ghost#9') });
    expect(res.status).toBe(404);
  });

  it('returns score and breakdown for a known user', async () => {
    mockGetUserByTag.mockResolvedValue(SAMPLE_USER);
    mockGetReputation.mockResolvedValue(SAMPLE_REPUTATION);
    const res = await GET(makeReq('Gamer#1'), { params: makeParams('Gamer#1') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gamerTag).toBe('Gamer#1');
    expect(body.score).toBe(47);
    expect(body.breakdown.helpfulReviews).toBe(5);
    expect(body.breakdown.upvotesReceived).toBe(22);
    expect(body.breakdown.commentsPosted).toBe(10);
    expect(body.breakdown.followersCount).toBe(10);
  });

  it('calls getUserReputation with the correct gamerTag', async () => {
    mockGetUserByTag.mockResolvedValue(SAMPLE_USER);
    mockGetReputation.mockResolvedValue(SAMPLE_REPUTATION);
    await GET(makeReq('Gamer#1'), { params: makeParams('Gamer#1') });
    expect(mockGetReputation).toHaveBeenCalledWith('Gamer#1');
  });

  it('returns score of 0 for a user with no activity', async () => {
    mockGetUserByTag.mockResolvedValue(SAMPLE_USER);
    mockGetReputation.mockResolvedValue({
      score: 0,
      breakdown: { helpfulReviews: 0, upvotesReceived: 0, commentsPosted: 0, followersCount: 0 },
    });
    const res = await GET(makeReq('Gamer#1'), { params: makeParams('Gamer#1') });
    const body = await res.json();
    expect(body.score).toBe(0);
  });
});
