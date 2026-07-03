jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/notificationPrefStore', () => ({
  getPreferences:    jest.fn(),
  upsertPreferences: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/users/me/notification-preferences/route';
import { getSession }                          from '@/lib/auth';
import { getPreferences, upsertPreferences }   from '@/lib/notificationPrefStore';

const mockSession = getSession        as jest.Mock;
const mockGet     = getPreferences    as jest.Mock;
const mockUpsert  = upsertPreferences as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };

const DEFAULT_PREFS = {
  gamerTag: 'Darla#1', newFollower: true, tipReceived: true,
  commentOnReview: true, mention: true, newGameReview: true, replyToComment: true,
};

function makeReq(method: string, body?: object) {
  return new NextRequest('http://localhost/api/users/me/notification-preferences', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockGet.mockResolvedValue(DEFAULT_PREFS);
  mockUpsert.mockResolvedValue({ ...DEFAULT_PREFS, tipReceived: false });
});

describe('GET /api/users/me/notification-preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(401);
  });

  it('returns current preferences for authenticated user', async () => {
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences.gamerTag).toBe('Darla#1');
    expect(body.preferences.newFollower).toBe(true);
    expect(body.preferences.tipReceived).toBe(true);
  });

  it('calls getPreferences with session gamerTag', async () => {
    await GET(makeReq('GET'));
    expect(mockGet).toHaveBeenCalledWith('Darla#1');
  });
});

describe('PATCH /api/users/me/notification-preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makeReq('PATCH', { tipReceived: false }));
    expect(res.status).toBe(401);
  });

  it('updates a single preference and returns 200', async () => {
    const res = await PATCH(makeReq('PATCH', { tipReceived: false }));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith('Darla#1', { tipReceived: false });
  });

  it('updates multiple preferences in one call', async () => {
    await PATCH(makeReq('PATCH', { tipReceived: false, mention: false }));
    expect(mockUpsert).toHaveBeenCalledWith('Darla#1', { tipReceived: false, mention: false });
  });

  it('returns 400 for unknown preference keys', async () => {
    const res = await PATCH(makeReq('PATCH', { hackerField: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown/i);
  });

  it('returns 400 when preference value is not boolean', async () => {
    const res = await PATCH(makeReq('PATCH', { tipReceived: 'yes' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/boolean/i);
  });

  it('returns 400 when no valid fields are provided', async () => {
    const res = await PATCH(makeReq('PATCH', {}));
    expect(res.status).toBe(400);
  });

  it('returns updated preferences in response', async () => {
    const res = await PATCH(makeReq('PATCH', { tipReceived: false }));
    const body = await res.json();
    expect(body.preferences.tipReceived).toBe(false);
  });
});
