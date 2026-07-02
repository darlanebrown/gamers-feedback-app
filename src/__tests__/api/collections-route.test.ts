jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/collectionStore', () => ({
  createCollection:        jest.fn(),
  getCollections:          jest.fn(),
  deleteCollection:        jest.fn(),
  addItemToCollection:     jest.fn(),
  removeItemFromCollection: jest.fn(),
  getCollectionItems:      jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/collections/route';
import { getSession } from '@/lib/auth';
import { createCollection, getCollections, deleteCollection } from '@/lib/collectionStore';

const mockSession        = getSession        as jest.Mock;
const mockCreate         = createCollection  as jest.Mock;
const mockGetCollections = getCollections    as jest.Mock;
const mockDelete         = deleteCollection  as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const COL     = { id: 'col1', ownerTag: 'Darla#1', name: 'RPGs', createdAt: new Date().toISOString() };

beforeEach(() => {
  jest.resetAllMocks();
  const cs = jest.requireMock('@/lib/collectionStore') as Record<string, jest.Mock>;
  cs.createCollection.mockResolvedValue(COL);
  cs.getCollections.mockResolvedValue([COL]);
  cs.deleteCollection.mockResolvedValue(true);
});

describe('GET /api/collections', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/collections'));
    expect(res.status).toBe(401);
  });

  it('returns the user collections', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(new NextRequest('http://localhost/api/collections'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collections).toHaveLength(1);
    expect(body.collections[0].name).toBe('RPGs');
  });
});

describe('POST /api/collections', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'RPGs' }),
    }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is blank', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    }));
    expect(res.status).toBe(400);
  });

  it('creates collection and returns 201', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'RPGs' }),
    }));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith('Darla#1', 'RPGs');
    const body = await res.json();
    expect(body.collection.name).toBe('RPGs');
  });

  it('returns 409 on duplicate collection name', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockCreate.mockRejectedValue({ code: 'P2002' });
    const res = await POST(new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'RPGs' }),
    }));
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/collections', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/collections?id=col1', { method: 'DELETE' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(new NextRequest('http://localhost/api/collections', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when collection not found or not owned', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockDelete.mockResolvedValue(false);
    const res = await DELETE(new NextRequest('http://localhost/api/collections?id=col1', { method: 'DELETE' }));
    expect(res.status).toBe(404);
  });

  it('deletes collection and returns ok', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(new NextRequest('http://localhost/api/collections?id=col1', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith('col1', 'Darla#1');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
