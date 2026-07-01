jest.mock('@/lib/userStore', () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserByTag: jest.fn(),
  countUsers: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn(),
  getSession: jest.fn(),
  setSessionCookie: jest.fn(),
  clearSessionCookie: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login }    from '@/app/api/auth/login/route';
import { POST as logout }   from '@/app/api/auth/logout/route';
import { GET  as me }       from '@/app/api/auth/me/route';
import { createUser, findUserByEmail, findUserByTag, countUsers } from '@/lib/userStore';
import bcrypt from 'bcryptjs';
import { signToken, getSession, clearSessionCookie } from '@/lib/auth';

const mockCreate       = createUser       as jest.Mock;
const mockFindEmail    = findUserByEmail  as jest.Mock;
const mockFindTag      = findUserByTag    as jest.Mock;
const mockCountUsers   = countUsers       as jest.Mock;
const mockHash         = bcrypt.hash      as jest.Mock;
const mockCompare      = bcrypt.compare   as jest.Mock;
const mockSign          = signToken         as jest.Mock;
const mockGetSession    = getSession        as jest.Mock;
const mockClearSession  = clearSessionCookie as jest.Mock;

const VALID_USER = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1', passwordHash: '$hashed', createdAt: new Date() };

beforeEach(() => { jest.resetAllMocks(); mockCountUsers.mockResolvedValue(1); });

// ── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a user and returns 201', async () => {
    mockFindEmail.mockResolvedValue(null);
    mockFindTag.mockResolvedValue(null);
    mockHash.mockResolvedValue('$hashed');
    mockCreate.mockResolvedValue(VALID_USER);
    mockSign.mockResolvedValue('tok.en.jwt');

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'darla@test.com', password: 'password123', gamerTag: 'Darla#1' }),
    });
    const res = await register(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user.email).toBe('darla@test.com');
    expect(body.user.gamerTag).toBe('Darla#1');
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('returns 409 when email already taken', async () => {
    mockFindEmail.mockResolvedValue(VALID_USER);

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'darla@test.com', password: 'password123', gamerTag: 'NewTag#1' }),
    });
    const res = await register(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it('returns 409 when gamer tag already taken', async () => {
    mockFindEmail.mockResolvedValue(null);
    mockFindTag.mockResolvedValue(VALID_USER);

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@test.com', password: 'password123', gamerTag: 'Darla#1' }),
    });
    const res = await register(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/gamer tag/i);
  });

  it('returns 400 when password is too short', async () => {
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'darla@test.com', password: 'short', gamerTag: 'Darla#1' }),
    });
    const res = await register(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'darla@test.com' }),
    });
    const res = await register(req);
    expect(res.status).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 and sets cookie on correct credentials', async () => {
    mockFindEmail.mockResolvedValue(VALID_USER);
    mockCompare.mockResolvedValue(true);
    mockSign.mockResolvedValue('tok.en.jwt');

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'darla@test.com', password: 'password123' }),
    });
    const res = await login(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.email).toBe('darla@test.com');
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 on wrong password', async () => {
    mockFindEmail.mockResolvedValue(VALID_USER);
    mockCompare.mockResolvedValue(false);

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'darla@test.com', password: 'wrongpass' }),
    });
    const res = await login(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when email not found', async () => {
    mockFindEmail.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@test.com', password: 'password123' }),
    });
    const res = await login(req);
    expect(res.status).toBe(401);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and calls clearSessionCookie', async () => {
    const req = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' });
    const res = await logout(req);
    expect(res.status).toBe(200);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });
});

// ── Me ────────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 200 with user when session is valid', async () => {
    mockGetSession.mockResolvedValue({ id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' });

    const req = new NextRequest('http://localhost/api/auth/me');
    const res = await me(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.gamerTag).toBe('Darla#1');
  });

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/me');
    const res = await me(req);
    expect(res.status).toBe(401);
  });
});
