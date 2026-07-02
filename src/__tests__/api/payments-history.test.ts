jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/paymentStore', () => ({
  getPaymentsByRecipient: jest.fn(),
  getPaymentsBySender:    jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getReceived } from '@/app/api/payments/received/route';
import { GET as getSent }     from '@/app/api/payments/sent/route';
import { getSession }                             from '@/lib/auth';
import { getPaymentsByRecipient, getPaymentsBySender } from '@/lib/paymentStore';

const mockSession   = getSession             as jest.Mock;
const mockReceived  = getPaymentsByRecipient as jest.Mock;
const mockSent      = getPaymentsBySender    as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };

const PAYMENTS = [
  { id: 'p1', stripeSessionId: 'cs_1', senderTag: 'Fan#2',   recipientTag: 'Darla#1', amountCents: 500,  status: 'completed', completedAt: new Date('2026-07-01'), createdAt: new Date('2026-07-01') },
  { id: 'p2', stripeSessionId: 'cs_2', senderTag: 'Gamer#3', recipientTag: 'Darla#1', amountCents: 1000, status: 'completed', completedAt: new Date('2026-07-02'), createdAt: new Date('2026-07-02') },
];

const SENT_PAYMENTS = [
  { id: 'p3', stripeSessionId: 'cs_3', senderTag: 'Darla#1', recipientTag: 'Creator#5', amountCents: 300, status: 'completed', completedAt: new Date('2026-06-30'), createdAt: new Date('2026-06-30') },
];

function makeReq(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockReceived.mockResolvedValue(PAYMENTS);
  mockSent.mockResolvedValue(SENT_PAYMENTS);
});

describe('GET /api/payments/received', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await getReceived(makeReq('/api/payments/received'));
    expect(res.status).toBe(401);
  });

  it('returns payments received by the current user', async () => {
    const res = await getReceived(makeReq('/api/payments/received'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payments).toHaveLength(2);
    expect(mockReceived).toHaveBeenCalledWith('Darla#1');
  });

  it('returns total and totalCents in response', async () => {
    const res = await getReceived(makeReq('/api/payments/received'));
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.totalCents).toBe(1500);
  });

  it('returns correct payment shape', async () => {
    const res = await getReceived(makeReq('/api/payments/received'));
    const body = await res.json();
    expect(body.payments[0]).toMatchObject({
      id:          'p1',
      senderTag:   'Fan#2',
      amountCents: 500,
      status:      'completed',
    });
  });

  it('returns empty payments with zero totals when none exist', async () => {
    mockReceived.mockResolvedValue([]);
    const res = await getReceived(makeReq('/api/payments/received'));
    const body = await res.json();
    expect(body.payments).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.totalCents).toBe(0);
  });
});

describe('GET /api/payments/sent', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await getSent(makeReq('/api/payments/sent'));
    expect(res.status).toBe(401);
  });

  it('returns payments sent by the current user', async () => {
    const res = await getSent(makeReq('/api/payments/sent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payments).toHaveLength(1);
    expect(mockSent).toHaveBeenCalledWith('Darla#1');
  });

  it('returns total and totalCents for sent payments', async () => {
    const res = await getSent(makeReq('/api/payments/sent'));
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.totalCents).toBe(300);
  });

  it('returns correct payment shape', async () => {
    const res = await getSent(makeReq('/api/payments/sent'));
    const body = await res.json();
    expect(body.payments[0]).toMatchObject({
      id:           'p3',
      recipientTag: 'Creator#5',
      amountCents:  300,
    });
  });

  it('returns empty payments with zero totals when none exist', async () => {
    mockSent.mockResolvedValue([]);
    const res = await getSent(makeReq('/api/payments/sent'));
    const body = await res.json();
    expect(body.payments).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.totalCents).toBe(0);
  });
});
