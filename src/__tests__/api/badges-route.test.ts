jest.mock('@/lib/badgeService', () => ({
  getUserBadges: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/badges/route';
import { getUserBadges } from '@/lib/badgeService';

const mockGetBadges = getUserBadges as jest.Mock;

const BADGES = [
  { id: 'first_review',   label: '🎮 First Review',   description: 'Submitted your first review' },
  { id: 'crowd_favorite', label: '❤️ Crowd Favorite', description: '10 or more upvotes' },
];

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/badgeService') as { getUserBadges: jest.Mock })
    .getUserBadges.mockResolvedValue(BADGES);
});

function makeReq(tag: string) {
  return new NextRequest(`http://localhost/api/profile/${encodeURIComponent(tag)}/badges`);
}

describe('GET /api/profile/[tag]/badges', () => {
  it('returns badges for a user tag — no auth required', async () => {
    const res = await GET(makeReq('Player#99'), { params: { tag: 'Player#99' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badges).toHaveLength(2);
    expect(body.badges[0].id).toBe('first_review');
  });

  it('calls getUserBadges with the decoded tag', async () => {
    await GET(makeReq('Player#99'), { params: { tag: 'Player#99' } });
    expect(mockGetBadges).toHaveBeenCalledWith('Player#99');
  });

  it('returns empty badges array for user with no activity', async () => {
    mockGetBadges.mockResolvedValue([]);
    const res = await GET(makeReq('New#1'), { params: { tag: 'New#1' } });
    const body = await res.json();
    expect(body.badges).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('includes total count in response', async () => {
    const res = await GET(makeReq('Player#99'), { params: { tag: 'Player#99' } });
    const body = await res.json();
    expect(body.total).toBe(2);
  });
});
