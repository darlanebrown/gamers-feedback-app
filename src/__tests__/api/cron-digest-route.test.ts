jest.mock('@/lib/userStore', () => ({
  getAllUsers: jest.fn(),
}));

jest.mock('@/lib/digestService', () => ({
  getUserDigestData: jest.fn(),
  hasActivity:       jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendDigestEmail: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/digest/route';
import { getAllUsers } from '@/lib/userStore';
import { getUserDigestData, hasActivity } from '@/lib/digestService';
import { sendDigestEmail } from '@/lib/emailService';

const mockGetAllUsers     = getAllUsers       as jest.Mock;
const mockGetDigest       = getUserDigestData as jest.Mock;
const mockHasActivity     = hasActivity       as jest.Mock;
const mockSendDigest      = sendDigestEmail   as jest.Mock;

const ACTIVE_DATA  = { newFollowers: 2, upvotes: 5, downvotes: 1, totalReviews: 8 };
const SILENT_DATA  = { newFollowers: 0, upvotes: 0, downvotes: 0, totalReviews: 3 };

const USERS = [
  { gamerTag: 'Darla#1',   email: 'darla@test.com',  banned: false },
  { gamerTag: 'Player#99', email: 'player@test.com', banned: false },
  { gamerTag: 'Ghost#00',  email: 'ghost@test.com',  banned: false },
];

function makeReq(secret?: string) {
  return new NextRequest('http://localhost/api/cron/digest', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  process.env.CRON_SECRET = 'super-secret';
  (jest.requireMock('@/lib/emailService') as { sendDigestEmail: jest.Mock })
    .sendDigestEmail.mockResolvedValue(undefined);
  // hasActivity uses real logic: active when any of followers/upvotes/downvotes > 0
  mockHasActivity.mockImplementation(
    (d: typeof ACTIVE_DATA) => d.newFollowers > 0 || d.upvotes > 0 || d.downvotes > 0,
  );
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/digest', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is wrong', async () => {
    const res = await GET(makeReq('wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('sends digest emails only to users with activity this week', async () => {
    mockGetAllUsers.mockResolvedValue(USERS);
    mockGetDigest
      .mockResolvedValueOnce(ACTIVE_DATA)   // Darla#1 — has activity
      .mockResolvedValueOnce(SILENT_DATA)   // Player#99 — no new followers/votes
      .mockResolvedValueOnce(SILENT_DATA);  // Ghost#00 — no new followers/votes

    await GET(makeReq('super-secret'));

    expect(mockSendDigest).toHaveBeenCalledTimes(1);
    expect(mockSendDigest).toHaveBeenCalledWith('darla@test.com', 'Darla#1', ACTIVE_DATA);
  });

  it('returns sent count in response', async () => {
    mockGetAllUsers.mockResolvedValue(USERS);
    mockGetDigest
      .mockResolvedValueOnce(ACTIVE_DATA)
      .mockResolvedValueOnce(ACTIVE_DATA)
      .mockResolvedValueOnce(SILENT_DATA);

    const res = await GET(makeReq('super-secret'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(2);
    expect(body.skipped).toBe(1);
  });

  it('skips banned users', async () => {
    mockGetAllUsers.mockResolvedValue([
      ...USERS,
      { gamerTag: 'Banned#1', email: 'banned@test.com', banned: true },
    ]);
    mockGetDigest.mockResolvedValue(ACTIVE_DATA);

    await GET(makeReq('super-secret'));

    const emailsSentTo = mockSendDigest.mock.calls.map((c) => c[0]);
    expect(emailsSentTo).not.toContain('banned@test.com');
  });
});
