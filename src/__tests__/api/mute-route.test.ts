jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/muteStore', () => ({
  addMute:     jest.fn(),
  removeMute:  jest.fn(),
  isMuted:     jest.fn(),
  getMutedTags: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/mutes/route';
import { getSession } from '@/lib/auth';
import { addMute, removeMute, isMuted, getMutedTags } from '@/lib/muteStore';

const mockSession      = getSession   as jest.Mock;
const mockAddMute      = addMute      as jest.Mock;
const mockRemoveMute   = removeMute   as jest.Mock;
const mockIsMuted      = isMuted      as jest.Mock;
const mockGetMutedTags = getMutedTags as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

beforeEach(() => {
  jest.resetAllMocks();
  const ms = jest.requireMock('@/lib/muteStore') as Record<string, jest.Mock>;
  ms.addMute.mockResolvedValue({ muterTag: 'Darla#1', mutedTag: 'Troll#99' });
  ms.removeMute.mockResolvedValue(undefined);
  ms.isMuted.mockResolvedValue(false);
  ms.getMutedTags.mockResolvedValue(['Troll#99']);
});

function makeGetReq() {
  return new NextRequest('http://localhost/api/mutes');
}

function makePostReq(mutedTag: string) {
  return new NextRequest('http://localhost/api/mutes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutedTag }),
  });
}

function makeDeleteReq(mutedTag: string) {
  return new NextRequest(`http://localhost/api/mutes?mutedTag=${encodeURIComponent(mutedTag)}`, {
    method: 'DELETE',
  });
}

describe('GET /api/mutes', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it('returns the list of muted tags', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.muted).toEqual(['Troll#99']);
  });
});

describe('POST /api/mutes', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makePostReq('Troll#99'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when mutedTag is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/mutes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when user tries to mute themselves', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq('Darla#1'));
    expect(res.status).toBe(400);
  });

  it('returns 409 when already muted', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockIsMuted.mockResolvedValue(true);
    const res = await POST(makePostReq('Troll#99'));
    expect(res.status).toBe(409);
  });

  it('mutes a user and returns ok', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq('Troll#99'));
    expect(res.status).toBe(201);
    expect(mockAddMute).toHaveBeenCalledWith('Darla#1', 'Troll#99');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe('DELETE /api/mutes', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq('Troll#99'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when mutedTag is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/mutes', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('unmutes a user and returns ok', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(makeDeleteReq('Troll#99'));
    expect(res.status).toBe(200);
    expect(mockRemoveMute).toHaveBeenCalledWith('Darla#1', 'Troll#99');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
