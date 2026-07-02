jest.mock('@/lib/auth', () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/wishlistStore', () => ({
  getWishlist: jest.fn(),
  addToWishlist: jest.fn(),
  removeFromWishlist: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/wishlist/route';
import { getSession } from '@/lib/auth';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/wishlistStore';

const mockGetSession = getSession         as jest.Mock;
const mockGetList    = getWishlist        as jest.Mock;
const mockAdd        = addToWishlist      as jest.Mock;
const mockRemove     = removeFromWishlist as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

function makeReq(method: string, body?: object) {
  return new NextRequest('http://localhost/api/wishlist', {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => jest.resetAllMocks());

// ── GET ───────────────────────────────────────────────────────────────────────

describe('GET /api/wishlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(401);
  });

  it('returns the wishlist for the authenticated user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetList.mockResolvedValue([
      { id: 'w1', gameTitle: 'Hades', createdAt: '2026-07-01T00:00:00.000Z' },
    ]);
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(200);
    expect(mockGetList).toHaveBeenCalledWith(SESSION.id);
    const body = await res.json();
    expect(body.wishlist).toHaveLength(1);
    expect(body.wishlist[0].gameTitle).toBe('Hades');
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST /api/wishlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeReq('POST', { gameTitle: 'Hades' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when gameTitle is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq('POST', {}));
    expect(res.status).toBe(400);
  });

  it('adds a game and returns 201', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAdd.mockResolvedValue({ id: 'w1', userId: 'u1', gameTitle: 'Hades', createdAt: new Date() });
    const res = await POST(makeReq('POST', { gameTitle: 'Hades' }));
    expect(res.status).toBe(201);
    expect(mockAdd).toHaveBeenCalledWith(SESSION.id, 'Hades');
    const body = await res.json();
    expect(body.item.gameTitle).toBe('Hades');
  });

  it('returns 409 when game is already in wishlist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const dupErr = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockAdd.mockRejectedValue(dupErr);
    const res = await POST(makeReq('POST', { gameTitle: 'Hades' }));
    expect(res.status).toBe(409);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/wishlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(makeReq('DELETE', { gameTitle: 'Hades' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when gameTitle is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await DELETE(makeReq('DELETE', {}));
    expect(res.status).toBe(400);
  });

  it('removes the game and returns 200', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockRemove.mockResolvedValue(true);
    const res = await DELETE(makeReq('DELETE', { gameTitle: 'Hades' }));
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith(SESSION.id, 'Hades');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 404 when game was not in wishlist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockRemove.mockResolvedValue(false);
    const res = await DELETE(makeReq('DELETE', { gameTitle: 'Missing Game' }));
    expect(res.status).toBe(404);
  });
});
