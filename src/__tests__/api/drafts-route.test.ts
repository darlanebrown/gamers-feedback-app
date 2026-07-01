jest.mock('@/lib/draftStore', () => ({
  getDraft:    jest.fn(),
  upsertDraft: jest.fn(),
  deleteDraft: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/drafts/route';
import { getDraft, upsertDraft, deleteDraft } from '@/lib/draftStore';
import { getSession } from '@/lib/auth';

const mockGetSession  = getSession  as jest.Mock;
const mockGetDraft    = getDraft    as jest.Mock;
const mockUpsertDraft = upsertDraft as jest.Mock;
const mockDeleteDraft = deleteDraft as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', email: 'darla@test.com', role: 'user' };
const DRAFT = {
  id: 'd1', reviewerTag: 'Darla#1', gameTitle: 'Elden Ring',
  platform: 'PC', rating: 9, headline: 'Great game',
  body: 'Really enjoyed every moment of it.',
  pros: 'Combat', cons: 'Difficulty', playtime: '80h',
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetDraft.mockResolvedValue(DRAFT);
  mockUpsertDraft.mockResolvedValue(DRAFT);
  mockDeleteDraft.mockResolvedValue(undefined);
});

describe('GET /api/drafts', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/drafts'));
    expect(res.status).toBe(401);
  });

  it('returns the draft for the authenticated user', async () => {
    const res = await GET(new NextRequest('http://localhost/api/drafts'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.draft.gameTitle).toBe('Elden Ring');
    expect(mockGetDraft).toHaveBeenCalledWith('Darla#1');
  });

  it('returns draft: null when no draft exists', async () => {
    mockGetDraft.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/drafts'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.draft).toBeNull();
  });
});

describe('PUT /api/drafts', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameTitle: 'Hades' }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it('upserts draft with provided fields and returns saved draft', async () => {
    const req = new NextRequest('http://localhost/api/drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameTitle: 'Elden Ring', rating: 9 }),
    });
    const res = await PUT(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockUpsertDraft).toHaveBeenCalledWith('Darla#1', { gameTitle: 'Elden Ring', rating: 9 });
    expect(body.draft).toBeDefined();
  });
});

describe('DELETE /api/drafts', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/drafts', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('deletes the draft and returns ok', async () => {
    const req = new NextRequest('http://localhost/api/drafts', { method: 'DELETE' });
    const res = await DELETE(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockDeleteDraft).toHaveBeenCalledWith('Darla#1');
    expect(body.ok).toBe(true);
  });
});
