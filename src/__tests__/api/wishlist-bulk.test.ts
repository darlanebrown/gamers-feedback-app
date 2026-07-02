jest.mock('@/lib/wishlistStore', () => ({
  getWishlist:       jest.fn(),
  addToWishlist:     jest.fn(),
  removeFromWishlist: jest.fn(),
  bulkAddToWishlist: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore', () => ({ getUserByTag: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/wishlist/bulk/route';
import { bulkAddToWishlist } from '@/lib/wishlistStore';
import { getSession } from '@/lib/auth';
import { getUserByTag } from '@/lib/userStore';

const mockBulkAdd    = bulkAddToWishlist as jest.Mock;
const mockGetSession = getSession        as jest.Mock;
const mockGetUser    = getUserByTag      as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };
const USER    = { id: 'u1', gamerTag: 'Darla#1', banned: false };

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/wishlist/bulk', {
    method: 'POST',
    body:   JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetUser.mockResolvedValue(USER);
  mockBulkAdd.mockResolvedValue({ added: 2, alreadyPresent: 1 });
});

describe('POST /api/wishlist/bulk', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeReq({ games: ['Hades', 'Celeste'] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when games is missing', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when games is not an array', async () => {
    const res = await POST(makeReq({ games: 'Hades' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when games array is empty', async () => {
    const res = await POST(makeReq({ games: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when games array exceeds 50 items', async () => {
    const games = Array.from({ length: 51 }, (_, i) => `Game ${i}`);
    const res = await POST(makeReq({ games }));
    expect(res.status).toBe(400);
  });

  it('adds games and returns added/alreadyPresent counts', async () => {
    const res = await POST(makeReq({ games: ['Hades', 'Celeste', 'Elden Ring'] }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.added).toBe(2);
    expect(body.alreadyPresent).toBe(1);
    expect(mockBulkAdd).toHaveBeenCalledWith('u1', ['Hades', 'Celeste', 'Elden Ring']);
  });
});
