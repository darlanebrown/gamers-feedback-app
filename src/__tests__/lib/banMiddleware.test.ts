jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/userStore', () => ({
  getUserById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { requireNotBanned } from '@/lib/banMiddleware';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/userStore';

const mockGetSession = getSession  as jest.Mock;
const mockGetUser    = getUserById as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const ACTIVE_USER = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1', banned: false };
const BANNED_USER = { ...ACTIVE_USER, banned: true };

beforeEach(() => jest.resetAllMocks());

function makeReq() {
  return new NextRequest('http://localhost/api/anything');
}

describe('requireNotBanned', () => {
  it('returns null when there is no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await requireNotBanned(makeReq());

    expect(result).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns null when the user is active', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetUser.mockResolvedValue(ACTIVE_USER);

    const result = await requireNotBanned(makeReq());

    expect(mockGetUser).toHaveBeenCalledWith('u1');
    expect(result).toBeNull();
  });

  it('returns 403 when the user is banned', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetUser.mockResolvedValue(BANNED_USER);

    const result = await requireNotBanned(makeReq());

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toMatch(/banned/i);
  });

  it('returns null when user record is not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetUser.mockResolvedValue(null);

    const result = await requireNotBanned(makeReq());

    expect(result).toBeNull();
  });
});
