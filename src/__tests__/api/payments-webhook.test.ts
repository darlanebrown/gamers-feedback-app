const mockConstructEvent = jest.fn();
jest.mock('@/lib/stripeClient', () => ({
  stripe:         jest.fn(() => ({ webhooks: { constructEvent: mockConstructEvent } })),
  isValidAmount:  (cents: number) => [300, 500, 1000, 2500].includes(cents) || cents >= 100,
  PRESET_AMOUNTS: new Set([300, 500, 1000, 2500]),
}));
jest.mock('@/lib/paymentStore', () => ({
  completePayment:      jest.fn(),
  getPaymentBySessionId: jest.fn(),
}));
jest.mock('@/lib/notificationStore', () => ({ createNotification: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/webhook/route';
import { completePayment, getPaymentBySessionId } from '@/lib/paymentStore';
import { createNotification } from '@/lib/notificationStore';

const mockComplete    = completePayment       as jest.Mock;
const mockGetBySession = getPaymentBySessionId as jest.Mock;
const mockNotify      = createNotification    as jest.Mock;

const COMPLETED_SESSION = {
  id:       'cs_test_123',
  metadata: { senderTag: 'Darla#1', recipientTag: 'Creator#5', amountCents: '500' },
};

const COMPLETED_PAYMENT = {
  id: 'pay1', stripeSessionId: 'cs_test_123',
  senderTag: 'Darla#1', recipientTag: 'Creator#5', amountCents: 500,
  status: 'completed', completedAt: new Date(), createdAt: new Date(),
};

function makeWebhookReq(body: string, sig = 'valid-sig') {
  return new NextRequest('http://localhost/api/payments/webhook', {
    method:  'POST',
    body,
    headers: { 'stripe-signature': sig },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockConstructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: COMPLETED_SESSION } });
  (jest.requireMock('@/lib/stripeClient') as { stripe: jest.Mock })
    .stripe.mockReturnValue({ webhooks: { constructEvent: mockConstructEvent } });
  mockGetBySession.mockResolvedValue(null);
  mockComplete.mockResolvedValue(COMPLETED_PAYMENT);
  mockNotify.mockResolvedValue(undefined);
});

describe('POST /api/payments/webhook', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST', body: '{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });
    const res = await POST(makeWebhookReq('{}', 'bad-sig'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/signature/i);
  });

  it('returns 200 and ignores non-checkout events', async () => {
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.created', data: { object: {} } });
    const res = await POST(makeWebhookReq('{}'));
    expect(res.status).toBe(200);
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('completes payment on checkout.session.completed', async () => {
    const res = await POST(makeWebhookReq(JSON.stringify(COMPLETED_SESSION)));
    expect(res.status).toBe(200);
    expect(mockComplete).toHaveBeenCalledWith('cs_test_123');
  });

  it('sends notification to recipient on payment completion', async () => {
    await POST(makeWebhookReq(JSON.stringify(COMPLETED_SESSION)));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientTag: 'Creator#5',
        type:         'tip_received',
        actorTag:     'Darla#1',
      }),
    );
  });

  it('notification includes amountCents in body', async () => {
    await POST(makeWebhookReq(JSON.stringify(COMPLETED_SESSION)));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('$5.00') }),
    );
  });

  it('returns 200 even if already completed (idempotent)', async () => {
    mockGetBySession.mockResolvedValue({ ...COMPLETED_PAYMENT, status: 'completed' });
    const res = await POST(makeWebhookReq(JSON.stringify(COMPLETED_SESSION)));
    expect(res.status).toBe(200);
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('returns 200 with received status', async () => {
    const res = await POST(makeWebhookReq(JSON.stringify(COMPLETED_SESSION)));
    const body = await res.json();
    expect(body.received).toBe(true);
  });
});
