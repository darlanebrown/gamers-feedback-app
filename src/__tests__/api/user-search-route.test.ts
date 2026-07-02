jest.mock('@/lib/userStore', () => ({
  findUserByTag: jest.fn(),
  searchUsers: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/search/route';
import { searchUsers } from '@/lib/userStore';

const mockSearch = searchUsers as jest.Mock;

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/users/search${query}`);
}

function makeUser(overrides = {}) {
  return {
    id: 'u1', gamerTag: 'Darla#1', displayName: 'Darla',
    bio: null, role: 'user', banned: false, createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/users/search', () => {
  it('returns 400 when q param is missing', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it('returns 400 when q is empty', async () => {
    const res = await GET(makeReq('?q='));
    expect(res.status).toBe(400);
  });

  it('returns matching users with default limit of 10', async () => {
    mockSearch.mockResolvedValue([makeUser(), makeUser({ id: 'u2', gamerTag: 'Darla#2' })]);
    const res = await GET(makeReq('?q=Darla'));
    expect(res.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith('Darla', 10);
    const body = await res.json();
    expect(body.users).toHaveLength(2);
    expect(body.users[0].passwordHash).toBeUndefined();
  });

  it('respects ?limit param clamped to max 20', async () => {
    mockSearch.mockResolvedValue([]);
    await GET(makeReq('?q=x&limit=50'));
    expect(mockSearch).toHaveBeenCalledWith('x', 20);
  });

  it('never exposes passwordHash in results', async () => {
    mockSearch.mockResolvedValue([{ ...makeUser(), passwordHash: '$secret' }]);
    const res = await GET(makeReq('?q=Darla'));
    const body = await res.json();
    expect(body.users[0].passwordHash).toBeUndefined();
  });

  it('returns empty array when no users match', async () => {
    mockSearch.mockResolvedValue([]);
    const res = await GET(makeReq('?q=nobody'));
    const body = await res.json();
    expect(body.users).toEqual([]);
  });
});
