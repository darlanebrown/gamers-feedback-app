jest.mock('@/lib/userStore', () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/paymentStore', () => ({ getPaymentsByRecipient: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/[tag]/tips/route';
import { findUserByTag }         from '@/lib/userStore';
import { getPaymentsByRecipient } from '@/lib/paymentStore';

const mockFindUser  = findUserByTag          as jest.Mock;
const mockGetTips   = getPaymentsByRecipient as jest.Mock;

const USER = { id: 'u1', gamerTag: 'Creator#5', banned: false };

const TIPS = [
  { id: 'p1', senderTag: 'Fan#1',   recipientTag: 'Creator#5', amountCents: 500,  status: 'completed', completedAt: new Date('2026-07-01') },
  { id: 'p2', senderTag: 'Fan#2',   recipientTag: 'Creator#5', amountCents: 1000, status: 'completed', completedAt: new Date('2026-07-02') },
  { id: 'p3', senderTag: 'Darla#1', recipientTag: 'Creator#5', amountCents: 300,  status: 'completed', completedAt: new Date('2026-07-03') },
];

function makeReq(tag: string) {
  return new NextRequest(`http://localhost/api/users/${tag}/tips`);
}
const makeParams = (tag: string) => Promise.resolve({ tag });

beforeEach(() => {
  jest.resetAllMocks();
  mockFindUser.mockResolvedValue(USER);
  mockGetTips.mockResolvedValue(TIPS);
});

describe('GET /api/users/[tag]/tips', () => {
  it('returns 404 when user does not exist', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await GET(makeReq('Ghost#9'), { params: makeParams('Ghost#9') });
    expect(res.status).toBe(404);
  });

  it('returns tip stats for existing user', async () => {
    const res = await GET(makeReq('Creator#5'), { params: makeParams('Creator#5') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gamerTag).toBe('Creator#5');
    expect(body.tipCount).toBe(3);
    expect(body.totalCents).toBe(1800);
  });

  it('returns formatted totalDollars string', async () => {
    const res = await GET(makeReq('Creator#5'), { params: makeParams('Creator#5') });
    const body = await res.json();
    expect(body.totalDollars).toBe('18.00');
  });

  it('returns recent tippers list (max 5, newest first)', async () => {
    const res = await GET(makeReq('Creator#5'), { params: makeParams('Creator#5') });
    const body = await res.json();
    expect(body.recentTippers).toEqual(['Darla#1', 'Fan#2', 'Fan#1']);
  });

  it('caps recentTippers at 5 entries', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`, senderTag: `Fan#${i}`, recipientTag: 'Creator#5',
      amountCents: 100, status: 'completed', completedAt: new Date(Date.now() - i * 1000),
    }));
    mockGetTips.mockResolvedValue(many);
    const res = await GET(makeReq('Creator#5'), { params: makeParams('Creator#5') });
    const body = await res.json();
    expect(body.recentTippers).toHaveLength(5);
  });

  it('returns zero stats when user has received no tips', async () => {
    mockGetTips.mockResolvedValue([]);
    const res = await GET(makeReq('Creator#5'), { params: makeParams('Creator#5') });
    const body = await res.json();
    expect(body.tipCount).toBe(0);
    expect(body.totalCents).toBe(0);
    expect(body.totalDollars).toBe('0.00');
    expect(body.recentTippers).toEqual([]);
  });

  it('is public — no auth required', async () => {
    const res = await GET(makeReq('Creator#5'), { params: makeParams('Creator#5') });
    expect(res.status).toBe(200);
  });
});
