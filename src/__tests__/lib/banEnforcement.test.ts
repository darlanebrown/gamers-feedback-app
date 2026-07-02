jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));
jest.mock('@/lib/userStore', () => ({
  getUserById:    jest.fn(),
  unbanUserByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { requireNotBanned } from '@/lib/banMiddleware';
import { getSession }                   from '@/lib/auth';
import { getUserById, unbanUserByTag }  from '@/lib/userStore';

const mockGetSession = getSession     as jest.Mock;
const mockGetUser    = getUserById    as jest.Mock;
const mockUnban      = unbanUserByTag as jest.Mock;

const SESSION      = { id: 'u1', gamerTag: 'Darla#1' };
const ACTIVE_USER  = { id: 'u1', gamerTag: 'Darla#1', banned: false, bannedUntil: null };
const PERM_BANNED  = { ...ACTIVE_USER, banned: true,  bannedUntil: null };
const TEMP_BANNED_ACTIVE  = { ...ACTIVE_USER, banned: true,  bannedUntil: new Date(Date.now() + 86_400_000) }; // future
const TEMP_BANNED_EXPIRED = { ...ACTIVE_USER, banned: true,  bannedUntil: new Date(Date.now() - 1000) };       // past

function makeReq() {
  return new NextRequest('http://localhost/api/anything');
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockUnban.mockResolvedValue({ ...ACTIVE_USER });
});

describe('requireNotBanned — bannedUntil enforcement', () => {
  it('passes through when user is not banned', async () => {
    mockGetUser.mockResolvedValue(ACTIVE_USER);
    const result = await requireNotBanned(makeReq());
    expect(result).toBeNull();
  });

  it('blocks permanently banned user with 403', async () => {
    mockGetUser.mockResolvedValue(PERM_BANNED);
    const result = await requireNotBanned(makeReq());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('blocks temporarily banned user whose ban has not expired', async () => {
    mockGetUser.mockResolvedValue(TEMP_BANNED_ACTIVE);
    const result = await requireNotBanned(makeReq());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.bannedUntil).toBeTruthy();
  });

  it('includes bannedUntil ISO string in error body for temporary bans', async () => {
    mockGetUser.mockResolvedValue(TEMP_BANNED_ACTIVE);
    const result = await requireNotBanned(makeReq());
    const body = await result!.json();
    expect(typeof body.bannedUntil).toBe('string');
    expect(new Date(body.bannedUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('auto-unbans user whose temporary ban has expired and passes through', async () => {
    mockGetUser.mockResolvedValue(TEMP_BANNED_EXPIRED);
    const result = await requireNotBanned(makeReq());
    expect(mockUnban).toHaveBeenCalledWith('Darla#1');
    expect(result).toBeNull();
  });

  it('does not call unban for permanently banned user', async () => {
    mockGetUser.mockResolvedValue(PERM_BANNED);
    await requireNotBanned(makeReq());
    expect(mockUnban).not.toHaveBeenCalled();
  });

  it('does not call unban for active temporary ban', async () => {
    mockGetUser.mockResolvedValue(TEMP_BANNED_ACTIVE);
    await requireNotBanned(makeReq());
    expect(mockUnban).not.toHaveBeenCalled();
  });
});
