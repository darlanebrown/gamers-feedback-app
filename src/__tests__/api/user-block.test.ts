jest.mock('@/lib/blockStore', () => ({
  toggleBlock:     jest.fn(),
  getBlockedTags:  jest.fn(),
  isBlocking:      jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/users/[tag]/block/route';
import { GET  } from '@/app/api/users/blocked/route';
import { toggleBlock, getBlockedTags } from '@/lib/blockStore';
import { getSession } from '@/lib/auth';

const mockToggle  = toggleBlock     as jest.Mock;
const mockGetList = getBlockedTags  as jest.Mock;
const mockSession = getSession      as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };

function makePostReq(tag: string) {
  return new NextRequest(`http://localhost/api/users/${tag}/block`, { method: 'POST' });
}

function makeGetReq() {
  return new NextRequest('http://localhost/api/users/blocked');
}

function makeParams(tag: string) {
  return Promise.resolve({ tag });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockToggle.mockResolvedValue(true);
  mockGetList.mockResolvedValue([]);
  (jest.requireMock('@/lib/blockStore') as { toggleBlock: jest.Mock })
    .toggleBlock.mockResolvedValue(true);
});

describe('POST /api/users/[tag]/block', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makePostReq('Bob#2'), { params: makeParams('Bob#2') });
    expect(res.status).toBe(401);
  });

  it('returns 400 when trying to block yourself', async () => {
    const res = await POST(makePostReq('Darla#1'), { params: makeParams('Darla#1') });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/yourself/i);
  });

  it('returns { blocked: true } when user is newly blocked', async () => {
    mockToggle.mockResolvedValue(true);
    const res = await POST(makePostReq('Bob#2'), { params: makeParams('Bob#2') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blocked).toBe(true);
    expect(mockToggle).toHaveBeenCalledWith('Darla#1', 'Bob#2');
  });

  it('returns { blocked: false } when user is unblocked', async () => {
    mockToggle.mockResolvedValue(false);
    const res = await POST(makePostReq('Bob#2'), { params: makeParams('Bob#2') });
    const body = await res.json();
    expect(body.blocked).toBe(false);
  });
});

describe('GET /api/users/blocked', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it('returns list of blocked gamer tags', async () => {
    mockGetList.mockResolvedValue(['Bob#2', 'Eve#3']);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blocked).toEqual(['Bob#2', 'Eve#3']);
    expect(mockGetList).toHaveBeenCalledWith('Darla#1');
  });

  it('returns empty array when no users are blocked', async () => {
    mockGetList.mockResolvedValue([]);
    const res = await GET(makeGetReq());
    const body = await res.json();
    expect(body.blocked).toEqual([]);
  });
});
