jest.mock('@/lib/userStore', () => ({
  findUserByEmail: jest.fn(),
  updateUserById: jest.fn(),
}));

jest.mock('@/lib/passwordResetStore', () => ({
  createPasswordReset: jest.fn(),
  findValidReset: jest.fn(),
  markResetUsed: jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword  } from '@/app/api/auth/reset-password/route';
import { findUserByEmail, updateUserById } from '@/lib/userStore';
import { createPasswordReset, findValidReset, markResetUsed } from '@/lib/passwordResetStore';
import { sendPasswordResetEmail } from '@/lib/emailService';
import bcrypt from 'bcryptjs';

const mockFindEmail      = findUserByEmail      as jest.Mock;
const mockUpdateUser     = updateUserById       as jest.Mock;
const mockCreateReset    = createPasswordReset  as jest.Mock;
const mockFindReset      = findValidReset       as jest.Mock;
const mockMarkUsed       = markResetUsed        as jest.Mock;
const mockSendEmail      = sendPasswordResetEmail as jest.Mock;
const mockHash           = bcrypt.hash          as jest.Mock;

const USER = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1', passwordHash: '$old' };
const RESET = { id: 'pr1', userId: 'u1', token: 'tok123', expiresAt: new Date(Date.now() + 3600_000), used: false };

function makeReq(path: string, body: object) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/emailService') as { sendPasswordResetEmail: jest.Mock })
    .sendPasswordResetEmail.mockResolvedValue(undefined);
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 even when email is not found (prevent enumeration)', async () => {
    mockFindEmail.mockResolvedValue(null);
    const res = await forgotPassword(makeReq('/api/auth/forgot-password', { email: 'nobody@test.com' }));
    expect(res.status).toBe(200);
    expect(mockCreateReset).not.toHaveBeenCalled();
  });

  it('creates a reset token and sends email when user exists', async () => {
    mockFindEmail.mockResolvedValue(USER);
    mockCreateReset.mockResolvedValue(RESET);
    const res = await forgotPassword(makeReq('/api/auth/forgot-password', { email: 'darla@test.com' }));
    expect(res.status).toBe(200);
    expect(mockCreateReset).toHaveBeenCalledWith(USER.id);
    expect(mockSendEmail).toHaveBeenCalledWith(USER.email, RESET.token);
  });

  it('returns 400 when email field is missing', async () => {
    const res = await forgotPassword(makeReq('/api/auth/forgot-password', {}));
    expect(res.status).toBe(400);
  });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  it('returns 400 when token or password is missing', async () => {
    const res = await resetPassword(makeReq('/api/auth/reset-password', { token: 'tok123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    mockFindReset.mockResolvedValue(RESET);
    const res = await resetPassword(makeReq('/api/auth/reset-password', { token: 'tok123', password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is invalid or expired', async () => {
    mockFindReset.mockResolvedValue(null);
    const res = await resetPassword(makeReq('/api/auth/reset-password', { token: 'bad', password: 'newpassword123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid|expired/i);
  });

  it('updates password hash and marks token used', async () => {
    mockFindReset.mockResolvedValue(RESET);
    mockHash.mockResolvedValue('$newhash');
    const res = await resetPassword(makeReq('/api/auth/reset-password', { token: 'tok123', password: 'newpassword123' }));
    expect(res.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith('newpassword123', 12);
    expect(mockUpdateUser).toHaveBeenCalledWith(RESET.userId, { passwordHash: '$newhash' });
    expect(mockMarkUsed).toHaveBeenCalledWith(RESET.id);
  });
});
