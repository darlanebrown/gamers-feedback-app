jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/collectionStore', () => ({
  createCollection:         jest.fn(),
  getCollections:           jest.fn(),
  deleteCollection:         jest.fn(),
  addItemToCollection:      jest.fn(),
  removeItemFromCollection: jest.fn(),
  getCollectionItems:       jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/collections/[id]/items/route';
import { getSession } from '@/lib/auth';
import { addItemToCollection, removeItemFromCollection, getCollectionItems } from '@/lib/collectionStore';

const mockSession = getSession             as jest.Mock;
const mockAdd     = addItemToCollection    as jest.Mock;
const mockRemove  = removeItemFromCollection as jest.Mock;
const mockGetItems = getCollectionItems    as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

beforeEach(() => {
  jest.resetAllMocks();
  const cs = jest.requireMock('@/lib/collectionStore') as Record<string, jest.Mock>;
  cs.addItemToCollection.mockResolvedValue({ collectionId: 'col1', reviewId: 'r1' });
  cs.removeItemFromCollection.mockResolvedValue(undefined);
  cs.getCollectionItems.mockResolvedValue(['r1', 'r2']);
});

function makeCtx() { return { params: { id: 'col1' } }; }

describe('GET /api/collections/[id]/items', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/collections/col1/items'), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns the list of review IDs in the collection', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(new NextRequest('http://localhost/api/collections/col1/items'), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviewIds).toEqual(['r1', 'r2']);
    expect(mockGetItems).toHaveBeenCalledWith('col1');
  });
});

describe('POST /api/collections/[id]/items', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(
      new NextRequest('http://localhost/api/collections/col1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: 'r1' }),
      }),
      makeCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when reviewId is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(
      new NextRequest('http://localhost/api/collections/col1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('adds a review and returns 201', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(
      new NextRequest('http://localhost/api/collections/col1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: 'r1' }),
      }),
      makeCtx(),
    );
    expect(res.status).toBe(201);
    expect(mockAdd).toHaveBeenCalledWith('col1', 'r1');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 409 on duplicate item', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockAdd.mockRejectedValue({ code: 'P2002' });
    const res = await POST(
      new NextRequest('http://localhost/api/collections/col1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: 'r1' }),
      }),
      makeCtx(),
    );
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/collections/[id]/items', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(
      new NextRequest('http://localhost/api/collections/col1/items?reviewId=r1', { method: 'DELETE' }),
      makeCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when reviewId is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(
      new NextRequest('http://localhost/api/collections/col1/items', { method: 'DELETE' }),
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('removes a review and returns ok', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(
      new NextRequest('http://localhost/api/collections/col1/items?reviewId=r1', { method: 'DELETE' }),
      makeCtx(),
    );
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith('col1', 'r1');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
