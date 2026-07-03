jest.mock('@/lib/reviewStore', () => ({
  addReview:                 jest.fn(),
  getAllReviews:             jest.fn(),
  getHelpfulReviews:        jest.fn(),
  getReviewsByGame:         jest.fn(),
  getRecentReviewCountByTag: jest.fn(),
  countAllReviews:          jest.fn(),
  countHelpfulReviews:      jest.fn(),
}));
jest.mock('@/lib/alertService', () => ({
  checkForBombing: jest.fn(),
}));
jest.mock('@/lib/gameFollowNotificationService', () => ({
  notifyGameFollowers: jest.fn(),
}));
jest.mock('@/lib/mentionService', () => ({
  notifyMentions: jest.fn(),
}));
jest.mock('@/lib/embeddingService', () => ({
  embedAndStore: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reviews/route';
import { addReview }       from '@/lib/reviewStore';
import { notifyMentions }  from '@/lib/mentionService';

const mockAdd    = addReview      as jest.Mock;
const mockNotify = notifyMentions as jest.Mock;

const VALID_BODY = {
  gameTitle: 'Hades', platform: 'PC', rating: 9,
  headline: 'Roguelike perfection',
  body: 'Amazing game! @Darla#1 and @Gamer#2 should try this.',
  pros: 'Great gameplay', cons: 'Repetitive', playtime: '80 hours',
  reviewerTag: 'Player#99',
};

const CREATED_REVIEW = {
  id: 'rev-1', ...VALID_BODY,
  classification: 'pending', createdAt: '2024-01-01T00:00:00.000Z',
};

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockAdd.mockResolvedValue(CREATED_REVIEW);
  mockNotify.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/alertService') as any).checkForBombing.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/gameFollowNotificationService') as any).notifyGameFollowers.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/reviewStore') as any).getRecentReviewCountByTag.mockResolvedValue(0);
  (jest.requireMock('@/lib/reviewStore') as any).countAllReviews.mockResolvedValue(0);
  (jest.requireMock('@/lib/reviewStore') as any).countHelpfulReviews.mockResolvedValue(0);
});

describe('POST /api/reviews — mention notifications', () => {
  it('calls notifyMentions after a review is created', async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('passes the review body text to notifyMentions', async () => {
    await POST(makeReq(VALID_BODY));
    const [bodyArg] = mockNotify.mock.calls[0];
    expect(bodyArg).toBe(VALID_BODY.body);
  });

  it('passes the new review id to notifyMentions', async () => {
    await POST(makeReq(VALID_BODY));
    const [, reviewIdArg] = mockNotify.mock.calls[0];
    expect(reviewIdArg).toBe('rev-1');
  });

  it('passes the reviewerTag as the actor to notifyMentions', async () => {
    await POST(makeReq(VALID_BODY));
    const [, , actorArg] = mockNotify.mock.calls[0];
    expect(actorArg).toBe('Player#99');
  });

  it('does not call notifyMentions when addReview throws', async () => {
    mockAdd.mockRejectedValue(new Error('DB error'));
    await POST(makeReq(VALID_BODY));
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('still returns 201 even if notifyMentions would reject', async () => {
    mockNotify.mockRejectedValue(new Error('notify failed'));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
  });
});
