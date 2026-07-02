jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore', () => ({ getUserById: jest.fn() }));
jest.mock('@/lib/appealStore', () => ({
  createAppeal: jest.fn(),
  hasAppeal:    jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/users/me/appeal/route';
import { getSession }    from '@/lib/auth';
import { getUserById }   from '@/lib/userStore';
import { createAppeal, hasAppeal } from '@/lib/appealStore';

const mockSession      = getSession   as jest.Mock;
const mockGetUser      = getUserById  as jest.Mock;
const mockCreateAppeal = createAppeal as jest.Mock;
const mockHasAppeal    = hasAppeal    as jest.Mock;

const SESSION     = { id: 'u1', gamerTag: 'BannedUser#3', role: 'user' };
const BANNED_USER = { id: 'u1', gamerTag: 'BannedUser#3', banned: true,  bannedUntil: null };
const ACTIVE_USER = { id: 'u1', gamerTag: 'ActiveUser#1', banned: false, bannedUntil: null };

const APPEAL = { id: 'ap1', gamerTag: 'BannedUser#3', message: 'I was wrongly banned', status: 'pending', createdAt: new Date() };

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/users/me/appeal', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockGetUser.mockResolvedValue(BANNED_USER);
  mockHasAppeal.mockResolvedValue(false);
  mockCreateAppeal.mockResolvedValue(APPEAL);
});

describe('POST /api/users/me/appeal', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq({ message: 'Please unban me' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not banned', async () => {
    mockGetUser.mockResolvedValue(ACTIVE_USER);
    const res = await POST(makeReq({ message: 'Please unban me' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not banned/i);
  });

  it('returns 400 when message is missing', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/message/i);
  });

  it('returns 400 when message is empty string', async () => {
    const res = await POST(makeReq({ message: '   ' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/message/i);
  });

  it('returns 409 when appeal already submitted', async () => {
    mockHasAppeal.mockResolvedValue(true);
    const res = await POST(makeReq({ message: 'Please unban me' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already submitted/i);
  });

  it('creates appeal and returns 201 on success', async () => {
    const res = await POST(makeReq({ message: 'I was wrongly banned' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.appeal.gamerTag).toBe('BannedUser#3');
    expect(body.appeal.status).toBe('pending');
  });

  it('calls createAppeal with gamerTag and trimmed message', async () => {
    await POST(makeReq({ message: '  I was wrongly banned  ' }));
    expect(mockCreateAppeal).toHaveBeenCalledWith('BannedUser#3', 'I was wrongly banned');
  });

  it('checks hasAppeal before creating', async () => {
    await POST(makeReq({ message: 'Please unban me' }));
    expect(mockHasAppeal).toHaveBeenCalledWith('BannedUser#3');
  });
});
