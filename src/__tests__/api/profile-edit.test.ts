jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore', () => ({ updateUserByTag: jest.fn(), findUserByTag: jest.fn() }));

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/users/me/profile/route';
import { getSession }    from '@/lib/auth';
import { updateUserByTag, findUserByTag } from '@/lib/userStore';

const mockSession    = getSession     as jest.Mock;
const mockUpdate     = updateUserByTag as jest.Mock;
const mockFindUser   = findUserByTag  as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', role: 'user' };
const USER    = { id: 'u1', gamerTag: 'Darla#1', displayName: 'Darla', bio: 'Gamer', email: 'darla@test.com', banned: false };
const UPDATED = { ...USER, displayName: 'Darla B', bio: 'Pro gamer & streamer' };

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/users/me/profile', {
    method: 'PATCH', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockFindUser.mockResolvedValue(USER);
  mockUpdate.mockResolvedValue(UPDATED);
});

describe('PATCH /api/users/me/profile', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makeReq({ displayName: 'Darla B' }));
    expect(res.status).toBe(401);
  });

  it('updates displayName and returns 200', async () => {
    const res = await PATCH(makeReq({ displayName: 'Darla B' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('Darla#1', expect.objectContaining({ displayName: 'Darla B' }));
  });

  it('updates bio and returns 200', async () => {
    const res = await PATCH(makeReq({ bio: 'Pro gamer & streamer' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('Darla#1', expect.objectContaining({ bio: 'Pro gamer & streamer' }));
  });

  it('updates both displayName and bio in one call', async () => {
    const res = await PATCH(makeReq({ displayName: 'Darla B', bio: 'Pro gamer & streamer' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('Darla#1', { displayName: 'Darla B', bio: 'Pro gamer & streamer' });
  });

  it('returns 400 when no updatable fields are provided', async () => {
    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/displayName.*bio/i);
  });

  it('returns 400 when displayName is empty string', async () => {
    const res = await PATCH(makeReq({ displayName: '   ' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/displayName/i);
  });

  it('returns 400 when displayName exceeds 50 characters', async () => {
    const res = await PATCH(makeReq({ displayName: 'A'.repeat(51) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/50/);
  });

  it('returns 400 when bio exceeds 300 characters', async () => {
    const res = await PATCH(makeReq({ bio: 'B'.repeat(301) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/300/);
  });

  it('returns updated user in response', async () => {
    const res = await PATCH(makeReq({ displayName: 'Darla B' }));
    const body = await res.json();
    expect(body.user.displayName).toBe('Darla B');
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('allows bio to be cleared with empty string', async () => {
    mockUpdate.mockResolvedValue({ ...USER, bio: null });
    const res = await PATCH(makeReq({ bio: '' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('Darla#1', expect.objectContaining({ bio: null }));
  });
});
