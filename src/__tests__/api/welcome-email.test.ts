jest.mock('@/lib/userStore', () => ({
  createUser:      jest.fn(),
  findUserByEmail: jest.fn(),
  findUserByTag:   jest.fn(),
  countUsers:      jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  signToken:        jest.fn().mockResolvedValue('tok'),
  setSessionCookie: jest.fn(),
  getSession:       jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { POST as register } from '@/app/api/auth/register/route';
import { createUser, findUserByEmail, findUserByTag, countUsers } from '@/lib/userStore';
import { sendWelcomeEmail } from '@/lib/emailService';

const mockCreate        = createUser       as jest.Mock;
const mockFindEmail     = findUserByEmail  as jest.Mock;
const mockFindTag       = findUserByTag    as jest.Mock;
const mockCountUsers    = countUsers       as jest.Mock;
const mockWelcomeEmail  = sendWelcomeEmail as jest.Mock;

const VALID_BODY = { email: 'darla@example.com', password: 'password123', gamerTag: 'Darla#1' };
const NEW_USER   = { id: 'u1', email: 'darla@example.com', gamerTag: 'Darla#1', role: 'user' };

function makeReq(body = VALID_BODY) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body:   JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockFindEmail.mockResolvedValue(null);
  mockFindTag.mockResolvedValue(null);
  mockCountUsers.mockResolvedValue(1);
  mockCreate.mockResolvedValue(NEW_USER);
  (jest.requireMock('@/lib/emailService') as { sendWelcomeEmail: jest.Mock })
    .sendWelcomeEmail.mockResolvedValue(undefined);
});

describe('welcome email on registration', () => {
  it('calls sendWelcomeEmail with email and gamerTag after successful registration', async () => {
    const res = await register(makeReq());
    expect(res.status).toBe(201);
    expect(mockWelcomeEmail).toHaveBeenCalledWith('darla@example.com', 'Darla#1');
  });

  it('does NOT call sendWelcomeEmail when registration fails (duplicate email)', async () => {
    mockFindEmail.mockResolvedValue(NEW_USER);
    await register(makeReq());
    expect(mockWelcomeEmail).not.toHaveBeenCalled();
  });

  it('does NOT call sendWelcomeEmail when registration fails (duplicate tag)', async () => {
    mockFindTag.mockResolvedValue(NEW_USER);
    await register(makeReq());
    expect(mockWelcomeEmail).not.toHaveBeenCalled();
  });

  it('registration still returns 201 if welcome email throws', async () => {
    mockWelcomeEmail.mockRejectedValue(new Error('email error'));
    const res = await register(makeReq());
    expect(res.status).toBe(201);
  });
});
