jest.mock('@/lib/auditLogStore',    () => ({ createAuditEntry: jest.fn() }));
jest.mock('@/lib/adminMiddleware',  () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/auth',             () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/securityLogger',   () => ({ logSecurityEvent: jest.fn() }));
jest.mock('@/lib/userStore',        () => ({
  getUserById:    jest.fn(),
  updateUserById: jest.fn(),
  findUserByTag:  jest.fn(),
}));
jest.mock('@/lib/reviewStore',      () => ({
  getReviewById:          jest.fn(),
  deleteReviewById:       jest.fn(),
  updateReviewClassification: jest.fn(),
  incrementViewCount:     jest.fn(),
}));
jest.mock('@/lib/featuredReviewStore', () => ({ setFeaturedReview: jest.fn() }));
jest.mock('@/lib/notificationStore',   () => ({ createNotification: jest.fn() }));
jest.mock('@/lib/emailService',        () => ({ sendReclassifyEmail: jest.fn() }));

import { NextRequest } from 'next/server';
import { PATCH as patchUser }   from '@/app/api/admin/users/[id]/route';
import { DELETE as deleteReview } from '@/app/api/admin/reviews/[id]/route';
import { POST as postFeatured }  from '@/app/api/admin/featured/route';
import { createAuditEntry }      from '@/lib/auditLogStore';
import { requireAdmin }          from '@/lib/adminMiddleware';
import { getSession }            from '@/lib/auth';
import { getUserById, updateUserById } from '@/lib/userStore';
import { getReviewById, deleteReviewById } from '@/lib/reviewStore';
import { setFeaturedReview }     from '@/lib/featuredReviewStore';

const mockAuditEntry    = createAuditEntry  as jest.Mock;
const mockRequireAdmin  = requireAdmin      as jest.Mock;
const mockGetSession    = getSession        as jest.Mock;
const mockGetUserById   = getUserById       as jest.Mock;
const mockUpdateUser    = updateUserById    as jest.Mock;
const mockGetReview     = getReviewById     as jest.Mock;
const mockDeleteReview  = deleteReviewById  as jest.Mock;
const mockSetFeatured   = setFeaturedReview as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const SAMPLE_USER   = { id: 'u1', gamerTag: 'Target#1', banned: false, role: 'user' };
const SAMPLE_REVIEW = { id: 'rev1', gameTitle: 'Hades', reviewerTag: 'User#1', classification: 'helpful', hasSpoilers: false };

function makeReq(url: string, opts: RequestInit = {}) {
  return new NextRequest(url, opts);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockRequireAdmin.mockResolvedValue(null);
  mockGetSession.mockResolvedValue(ADMIN_SESSION);
  mockGetUserById.mockResolvedValue(SAMPLE_USER);
  mockUpdateUser.mockResolvedValue(SAMPLE_USER);
  mockGetReview.mockResolvedValue(SAMPLE_REVIEW);
  mockDeleteReview.mockResolvedValue(undefined);
  mockSetFeatured.mockResolvedValue(undefined);
  mockAuditEntry.mockResolvedValue(undefined);
});

describe('Admin audit log wire-up', () => {
  it('writes admin_ban audit entry on ban action', async () => {
    await patchUser(
      makeReq('http://localhost/api/admin/users/u1', { method: 'PATCH', body: JSON.stringify({ action: 'ban' }) }),
      { params: { id: 'u1' } },
    );
    expect(mockAuditEntry).toHaveBeenCalledWith('admin_ban', 'Admin#1', 'u1', expect.any(String));
  });

  it('writes admin_unban audit entry on unban action', async () => {
    await patchUser(
      makeReq('http://localhost/api/admin/users/u1', { method: 'PATCH', body: JSON.stringify({ action: 'unban' }) }),
      { params: { id: 'u1' } },
    );
    expect(mockAuditEntry).toHaveBeenCalledWith('admin_unban', 'Admin#1', 'u1', expect.any(String));
  });

  it('writes admin_promote audit entry on promote action', async () => {
    await patchUser(
      makeReq('http://localhost/api/admin/users/u1', { method: 'PATCH', body: JSON.stringify({ action: 'promote' }) }),
      { params: { id: 'u1' } },
    );
    expect(mockAuditEntry).toHaveBeenCalledWith('admin_promote', 'Admin#1', 'u1', expect.any(String));
  });

  it('writes admin_review_delete audit entry on review deletion', async () => {
    await deleteReview(
      makeReq('http://localhost/api/admin/reviews/rev1', { method: 'DELETE' }),
      { params: { id: 'rev1' } },
    );
    expect(mockAuditEntry).toHaveBeenCalledWith('admin_review_delete', 'Admin#1', 'rev1', expect.any(String));
  });

  it('writes admin_feature_review audit entry when featuring a review', async () => {
    await postFeatured(
      makeReq('http://localhost/api/admin/featured', { method: 'POST', body: JSON.stringify({ reviewId: 'rev1' }) }),
    );
    expect(mockAuditEntry).toHaveBeenCalledWith('admin_feature_review', 'Admin#1', 'rev1', expect.any(String));
  });
});
