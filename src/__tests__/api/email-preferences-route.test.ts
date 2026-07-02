jest.mock('@/lib/auth', () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/preferenceStore', () => ({
  getEmailPreferences: jest.fn(),
  setEmailPreference: jest.fn(),
  PREFERENCE_TYPES: ['follow', 'vote', 'reclassify', 'comment', 'digest'],
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/auth/me/preferences/route';
import { getSession } from '@/lib/auth';
import { getEmailPreferences, setEmailPreference } from '@/lib/preferenceStore';

const mockGetSession = getSession         as jest.Mock;
const mockGetPrefs   = getEmailPreferences as jest.Mock;
const mockSetPref    = setEmailPreference  as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const ALL_PREFS = { follow: true, vote: true, reclassify: true, comment: true, digest: true };

function makeReq(method: string, body?: object) {
  return new NextRequest('http://localhost/api/auth/me/preferences', {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => jest.resetAllMocks());

// ── GET /api/auth/me/preferences ──────────────────────────────────────────────

describe('GET /api/auth/me/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(401);
  });

  it('returns all preferences for the authenticated user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetPrefs.mockResolvedValue(ALL_PREFS);
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual(ALL_PREFS);
    expect(mockGetPrefs).toHaveBeenCalledWith(SESSION.id);
  });
});

// ── PATCH /api/auth/me/preferences ───────────────────────────────────────────

describe('PATCH /api/auth/me/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(makeReq('PATCH', { type: 'vote', enabled: false }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when type is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PATCH(makeReq('PATCH', { enabled: false }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid preference type', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PATCH(makeReq('PATCH', { type: 'unknown', enabled: false }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid type/i);
  });

  it('returns 400 when enabled is not a boolean', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PATCH(makeReq('PATCH', { type: 'vote', enabled: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('upserts the preference and returns updated preferences', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockSetPref.mockResolvedValue(undefined);
    mockGetPrefs.mockResolvedValue({ ...ALL_PREFS, vote: false });
    const res = await PATCH(makeReq('PATCH', { type: 'vote', enabled: false }));
    expect(res.status).toBe(200);
    expect(mockSetPref).toHaveBeenCalledWith(SESSION.id, 'vote', false);
    const body = await res.json();
    expect(body.preferences.vote).toBe(false);
  });
});
