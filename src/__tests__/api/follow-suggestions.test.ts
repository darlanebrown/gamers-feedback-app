jest.mock('@/lib/followSuggestionsService', () => ({
  getFollowSuggestions: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/suggested/route';
import { getFollowSuggestions } from '@/lib/followSuggestionsService';
import { getSession } from '@/lib/auth';

const mockGetSuggestions = getFollowSuggestions as jest.Mock;
const mockGetSession     = getSession           as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };

const SAMPLE_SUGGESTIONS = [
  { gamerTag: 'Player#2', sharedGames: 4, displayName: 'Player Two' },
  { gamerTag: 'Gamer#3',  sharedGames: 2, displayName: null          },
];

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/users/suggested${query}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSuggestions.mockResolvedValue(SAMPLE_SUGGESTIONS);
});

describe('GET /api/users/suggested', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns suggestions for authenticated user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(2);
    expect(body.suggestions[0].gamerTag).toBe('Player#2');
    expect(body.suggestions[0].sharedGames).toBe(4);
  });

  it('passes default limit=10 to service', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    await GET(makeReq());
    expect(mockGetSuggestions).toHaveBeenCalledWith('Darla#1', 10);
  });

  it('respects ?limit query param', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    await GET(makeReq('?limit=5'));
    expect(mockGetSuggestions).toHaveBeenCalledWith('Darla#1', 5);
  });

  it('clamps limit to max 20', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    await GET(makeReq('?limit=999'));
    expect(mockGetSuggestions).toHaveBeenCalledWith('Darla#1', 20);
  });

  it('returns empty array when no suggestions exist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetSuggestions.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });
});
