jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/commentStore', () => ({
  deleteCommentAsAdmin: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/admin/comments/[id]/route';
import { getSession } from '@/lib/auth';
import { deleteCommentAsAdmin } from '@/lib/commentStore';

const mockSession = getSession           as jest.Mock;
const mockDelete  = deleteCommentAsAdmin as jest.Mock;

const ADMIN = { id: 'u1', email: 'admin@test.com', gamerTag: 'Admin#1', role: 'admin' };
const USER  = { id: 'u2', email: 'user@test.com',  gamerTag: 'User#1',  role: 'user'  };

function makeReq() {
  return new NextRequest('http://localhost/api/admin/comments/c1', { method: 'DELETE' });
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/commentStore') as { deleteCommentAsAdmin: jest.Mock })
    .deleteCommentAsAdmin.mockResolvedValue(true);
});

describe('DELETE /api/admin/comments/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: { id: 'c1' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER);
    const res = await DELETE(makeReq(), { params: { id: 'c1' } });
    expect(res.status).toBe(403);
  });

  it('deletes any comment as admin and returns ok', async () => {
    mockSession.mockResolvedValue(ADMIN);
    const res = await DELETE(makeReq(), { params: { id: 'c1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('c1');
  });

  it('returns 404 when comment does not exist', async () => {
    mockSession.mockResolvedValue(ADMIN);
    mockDelete.mockResolvedValue(false);
    const res = await DELETE(makeReq(), { params: { id: 'c1' } });
    expect(res.status).toBe(404);
  });
});
