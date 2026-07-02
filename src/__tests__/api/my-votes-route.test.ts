jest.mock('@/lib/auth', () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/voteStore', () => ({
  upsertVote: jest.fn(),
  removeVote: jest.fn(),
  getVoteCounts: jest.fn(),
  getUserVote: jest.fn(),
  getVotesByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/votes/mine/route';
import { getSession } from '@/lib/auth';
import { getVotesByTag } from '@/lib/voteStore';

const mockGetSession = getSession     as jest.Mock;
const mockGetVotes   = getVotesByTag  as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

function makeVote(overrides = {}) {
  return {
    id: 'v1', reviewId: 'r1', voterTag: 'Darla#1', type: 'up',
    gameTitle: 'Hades', reviewerTag: 'Player#99',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/votes/mine${query}`);
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/votes/mine', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns the vote history for the authenticated user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetVotes.mockResolvedValue([makeVote(), makeVote({ id: 'v2', reviewId: 'r2', type: 'down' })]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(mockGetVotes).toHaveBeenCalledWith('Darla#1', { skip: 0, take: 20 });
    const body = await res.json();
    expect(body.votes).toHaveLength(2);
    expect(body.votes[0].type).toBe('up');
    expect(body.votes[1].type).toBe('down');
  });

  it('supports ?type=up to filter by vote type', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetVotes.mockResolvedValue([makeVote()]);
    const res = await GET(makeReq('?type=up'));
    expect(mockGetVotes).toHaveBeenCalledWith('Darla#1', { skip: 0, take: 20, type: 'up' });
    expect(res.status).toBe(200);
  });

  it('returns 400 for an invalid ?type value', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(makeReq('?type=sideways'));
    expect(res.status).toBe(400);
  });

  it('supports pagination via ?page and ?limit', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetVotes.mockResolvedValue([]);
    await GET(makeReq('?page=3&limit=5'));
    expect(mockGetVotes).toHaveBeenCalledWith('Darla#1', { skip: 10, take: 5 });
  });

  it('returns an empty array when user has no votes', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetVotes.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.votes).toEqual([]);
  });
});
