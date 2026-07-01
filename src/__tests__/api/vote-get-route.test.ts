jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/voteStore', () => ({
  getVoteCounts: jest.fn(),
  getUserVote:   jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/[id]/vote/route';
import { getSession } from '@/lib/auth';
import { getVoteCounts, getUserVote } from '@/lib/voteStore';

const mockSession   = getSession    as jest.Mock;
const mockGetCounts = getVoteCounts as jest.Mock;
const mockGetVote   = getUserVote   as jest.Mock;

function makeReq() {
  return new NextRequest('http://localhost/api/reviews/r1/vote', { method: 'GET' });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetCounts.mockResolvedValue({ up: 4, down: 2 });
  mockGetVote.mockResolvedValue(null);
});

describe('GET /api/reviews/[id]/vote', () => {
  it('returns votes and null userVote when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.votes).toEqual({ up: 4, down: 2 });
    expect(body.userVote).toBeNull();
    expect(mockGetVote).not.toHaveBeenCalled();
  });

  it('returns votes and userVote when authenticated', async () => {
    mockSession.mockResolvedValue({ gamerTag: 'Darla#1' });
    mockGetVote.mockResolvedValue('up');
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.votes).toEqual({ up: 4, down: 2 });
    expect(body.userVote).toBe('up');
    expect(mockGetVote).toHaveBeenCalledWith('r1', 'Darla#1');
  });

  it('returns zero counts when no votes exist', async () => {
    mockSession.mockResolvedValue(null);
    mockGetCounts.mockResolvedValue({ up: 0, down: 0 });
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(body.votes).toEqual({ up: 0, down: 0 });
  });
});
