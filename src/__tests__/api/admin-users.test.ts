jest.mock('@/lib/adminMiddleware', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/userStore', () => ({
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUserById: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET  } from '@/app/api/admin/users/route';
import { PATCH } from '@/app/api/admin/users/[id]/route';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getAllUsers, getUserById, updateUserById } from '@/lib/userStore';

const mockGuard    = requireAdmin   as jest.Mock;
const mockGetAll   = getAllUsers     as jest.Mock;
const mockGetOne   = getUserById    as jest.Mock;
const mockUpdate   = updateUserById as jest.Mock;

const ADMIN_PASS  = null;
const UNAUTH_FAIL = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const FORBID_FAIL = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

function makeUser(overrides = {}) {
  return {
    id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1',
    role: 'user', banned: false, createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

// ── GET /api/admin/users ──────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('blocks unauthenticated requests', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/users'));
    expect(res.status).toBe(401);
  });

  it('blocks non-admin users', async () => {
    mockGuard.mockResolvedValue(FORBID_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/users'));
    expect(res.status).toBe(403);
  });

  it('returns all users for admin', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetAll.mockResolvedValue([makeUser(), makeUser({ id: 'u2', gamerTag: 'Player#2' })]);
    const res = await GET(new NextRequest('http://localhost/api/admin/users'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.users).toHaveLength(2);
  });

  it('never exposes passwordHash', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetAll.mockResolvedValue([makeUser()]);
    const res = await GET(new NextRequest('http://localhost/api/admin/users'));
    const body = await res.json();
    expect(body.users[0].passwordHash).toBeUndefined();
  });
});

// ── PATCH /api/admin/users/[id] ───────────────────────────────────────────────

describe('PATCH /api/admin/users/[id]', () => {
  it('blocks unauthenticated requests', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const req = new NextRequest('http://localhost/api/admin/users/u1', {
      method: 'PATCH', body: JSON.stringify({ action: 'ban' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'u1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/admin/users/bad', {
      method: 'PATCH', body: JSON.stringify({ action: 'ban' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'bad' } });
    expect(res.status).toBe(404);
  });

  it('bans a user', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(makeUser({ banned: false }));
    mockUpdate.mockResolvedValue(makeUser({ banned: true }));
    const req = new NextRequest('http://localhost/api/admin/users/u1', {
      method: 'PATCH', body: JSON.stringify({ action: 'ban' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'u1' } });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('u1', { banned: true });
  });

  it('unbans a user', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(makeUser({ banned: true }));
    mockUpdate.mockResolvedValue(makeUser({ banned: false }));
    const req = new NextRequest('http://localhost/api/admin/users/u1', {
      method: 'PATCH', body: JSON.stringify({ action: 'unban' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'u1' } });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('u1', { banned: false });
  });

  it('promotes a user to admin', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(makeUser({ role: 'user' }));
    mockUpdate.mockResolvedValue(makeUser({ role: 'admin' }));
    const req = new NextRequest('http://localhost/api/admin/users/u1', {
      method: 'PATCH', body: JSON.stringify({ action: 'promote' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'u1' } });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('u1', { role: 'admin' });
  });

  it('returns 400 for unknown action', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(makeUser());
    const req = new NextRequest('http://localhost/api/admin/users/u1', {
      method: 'PATCH', body: JSON.stringify({ action: 'delete' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'u1' } });
    expect(res.status).toBe(400);
  });
});
