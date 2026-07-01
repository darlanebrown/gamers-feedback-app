jest.mock('@/lib/userStore', () => ({
  getUserById: jest.fn(),
  updateProfile: jest.fn(),
  anonymizeUser: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/auth/me/route';
import { getUserById, updateProfile, anonymizeUser } from '@/lib/userStore';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const mockGetSession = getSession as jest.Mock;
const mockGetUserById = getUserById as jest.Mock;
const mockUpdateProfile = updateProfile as jest.Mock;
const mockAnonymizeUser = anonymizeUser as jest.Mock;
const mockCompare = bcrypt.compare as jest.Mock;
const mockHash = bcrypt.hash as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', email: 'darla@test.com', role: 'user' };
const USER = {
  id: 'u1', email: 'darla@test.com', passwordHash: '$hashed',
  gamerTag: 'Darla#1', displayName: null, bio: null, role: 'user', banned: false,
  createdAt: new Date(),
};

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetUserById.mockResolvedValue(USER);
  mockUpdateProfile.mockResolvedValue({ ...USER, passwordHash: undefined });
  mockAnonymizeUser.mockResolvedValue(undefined);
  mockCompare.mockResolvedValue(true);
  mockHash.mockResolvedValue('$newhash');
});

describe('PATCH /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(makeReq({ displayName: 'Darla' }));
    expect(res.status).toBe(401);
  });

  it('updates displayName and bio', async () => {
    const res = await PATCH(makeReq({ displayName: 'Darla B', bio: 'Gamer' }));
    expect(res.status).toBe(200);
    expect(mockUpdateProfile).toHaveBeenCalledWith('u1', { displayName: 'Darla B', bio: 'Gamer' });
  });

  it('returns 400 when newPassword provided without currentPassword', async () => {
    const res = await PATCH(makeReq({ newPassword: 'newpass123' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when currentPassword is wrong', async () => {
    mockCompare.mockResolvedValue(false);
    const res = await PATCH(makeReq({ currentPassword: 'wrong', newPassword: 'newpass123' }));
    expect(res.status).toBe(401);
  });

  it('updates password when currentPassword is correct', async () => {
    const res = await PATCH(makeReq({ currentPassword: 'correct', newPassword: 'newpass123' }));
    expect(res.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith('newpass123', 12);
    expect(mockUpdateProfile).toHaveBeenCalledWith('u1', { passwordHash: '$newhash' });
  });

  it('returns 400 when newPassword is too short', async () => {
    const res = await PATCH(makeReq({ currentPassword: 'correct', newPassword: 'abc' }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/auth/me', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('anonymizes the account and returns 200', async () => {
    const req = new NextRequest('http://localhost/api/auth/me', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockAnonymizeUser).toHaveBeenCalledWith('u1');
  });
});
