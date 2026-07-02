jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore', () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/paymentStore', () => ({ createPendingPayment: jest.fn() }));

const mockStripeCreate = jest.fn();
jest.mock('@/lib/stripeClient', () => ({
  stripe:         jest.fn(),
  isValidAmount:  (cents: number) => [300, 500, 1000, 2500].includes(cents) || cents >= 100,
  PRESET_AMOUNTS: new Set([300, 500, 1000, 2500]),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/checkout/route';
import { getSession }    from '@/lib/auth';
import { findUserByTag } from '@/lib/userStore';
import { createPendingPayment } from '@/lib/paymentStore';

const mockSession       = getSession           as jest.Mock;
const mockFindUser      = findUserByTag        as jest.Mock;
const mockCreatePayment = createPendingPayment as jest.Mock;

const SESSION        = { gamerTag: 'Darla#1', role: 'user' };
const RECIPIENT      = { id: 'u2', gamerTag: 'Creator#5', email: 'creator@test.com' };
const STRIPE_SESSION = { id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' };

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/payments/checkout', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockFindUser.mockResolvedValue(RECIPIENT);
  mockCreatePayment.mockResolvedValue(undefined);
  mockStripeCreate.mockResolvedValue(STRIPE_SESSION);
  (jest.requireMock('@/lib/stripeClient') as { stripe: jest.Mock })
    .stripe.mockReturnValue({ checkout: { sessions: { create: mockStripeCreate } } });
});

const VALID_AMOUNTS = [300, 500, 1000, 2500];

describe('POST /api/payments/checkout', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq({ recipientTag: 'Creator#5', amountCents: 500 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when recipientTag is missing', async () => {
    const res = await POST(makeReq({ amountCents: 500 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/recipientTag/i);
  });

  it('returns 400 when amountCents is missing', async () => {
    const res = await POST(makeReq({ recipientTag: 'Creator#5' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/amountCents/i);
  });

  it('returns 400 for amount below minimum', async () => {
    const res = await POST(makeReq({ recipientTag: 'Creator#5', amountCents: 99 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/amount/i);
  });

  it('returns 400 for custom amount below minimum (< 100 cents)', async () => {
    const res = await POST(makeReq({ recipientTag: 'Creator#5', amountCents: 50 }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when recipient does not exist', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await POST(makeReq({ recipientTag: 'Ghost#9', amountCents: 500 }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when trying to pay yourself', async () => {
    mockFindUser.mockResolvedValue({ ...RECIPIENT, gamerTag: 'Darla#1' });
    const res = await POST(makeReq({ recipientTag: 'Darla#1', amountCents: 500 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/yourself/i);
  });

  it.each(VALID_AMOUNTS)('accepts preset amount %i cents', async (amount) => {
    const res = await POST(makeReq({ recipientTag: 'Creator#5', amountCents: amount }));
    expect(res.status).toBe(200);
  });

  it('accepts custom amount >= 100 cents', async () => {
    const res = await POST(makeReq({ recipientTag: 'Creator#5', amountCents: 750 }));
    expect(res.status).toBe(200);
  });

  it('returns checkout url on success', async () => {
    const res = await POST(makeReq({ recipientTag: 'Creator#5', amountCents: 500 }));
    const body = await res.json();
    expect(body.url).toBe(STRIPE_SESSION.url);
  });

  it('creates a pending payment record', async () => {
    await POST(makeReq({ recipientTag: 'Creator#5', amountCents: 500 }));
    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: STRIPE_SESSION.id,
        senderTag:       'Darla#1',
        recipientTag:    'Creator#5',
        amountCents:     500,
      }),
    );
  });
});
