jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: { count: jest.fn() },
    alert: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/emailService', () => ({
  sendBombingEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/webhookService', () => ({
  sendBombingWebhook: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/lib/prisma';
import { checkForBombing, getActiveAlerts, dismissAlert } from '@/lib/alertService';
import { sendBombingEmail } from '@/lib/emailService';
import { sendBombingWebhook } from '@/lib/webhookService';

const mockSendBombingEmail   = sendBombingEmail   as jest.Mock;
const mockSendBombingWebhook = sendBombingWebhook as jest.Mock;

const mockReviewCount = prisma.review.count as jest.Mock;
const mockAlertFindFirst = prisma.alert.findFirst as jest.Mock;
const mockAlertCreate = prisma.alert.create as jest.Mock;
const mockAlertFindMany = prisma.alert.findMany as jest.Mock;
const mockAlertUpdate = prisma.alert.update as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/emailService') as { sendBombingEmail: jest.Mock })
    .sendBombingEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/webhookService') as { sendBombingWebhook: jest.Mock })
    .sendBombingWebhook.mockResolvedValue(undefined);
});

describe('checkForBombing', () => {
  it('creates an alert when threshold is met and no open alert exists', async () => {
    mockReviewCount.mockResolvedValue(5);
    mockAlertFindFirst.mockResolvedValue(null);
    mockAlertCreate.mockResolvedValue({});

    await checkForBombing('Elden Ring');

    expect(mockAlertCreate).toHaveBeenCalledWith({
      data: { type: 'review_bombing', gameTitle: 'Elden Ring', count: 5 },
    });
  });

  it('fires email and webhook when a new bombing alert is created', async () => {
    mockReviewCount.mockResolvedValue(6);
    mockAlertFindFirst.mockResolvedValue(null);
    mockAlertCreate.mockResolvedValue({});

    await checkForBombing('Halo Infinite');

    expect(mockSendBombingEmail).toHaveBeenCalledWith('Halo Infinite', 6);
    expect(mockSendBombingWebhook).toHaveBeenCalledWith('Halo Infinite', 6);
  });

  it('does not fire email or webhook when count is below threshold', async () => {
    mockReviewCount.mockResolvedValue(3);

    await checkForBombing('Halo Infinite');

    expect(mockSendBombingEmail).not.toHaveBeenCalled();
    expect(mockSendBombingWebhook).not.toHaveBeenCalled();
  });

  it('does not fire email or webhook when a duplicate alert already exists', async () => {
    mockReviewCount.mockResolvedValue(8);
    mockAlertFindFirst.mockResolvedValue({ id: 'a1', dismissed: false });

    await checkForBombing('Halo Infinite');

    expect(mockSendBombingEmail).not.toHaveBeenCalled();
    expect(mockSendBombingWebhook).not.toHaveBeenCalled();
  });

  it('does not create an alert when count is below threshold', async () => {
    mockReviewCount.mockResolvedValue(4);

    await checkForBombing('Elden Ring');

    expect(mockAlertCreate).not.toHaveBeenCalled();
  });

  it('does not create a duplicate alert when one is already open', async () => {
    mockReviewCount.mockResolvedValue(7);
    mockAlertFindFirst.mockResolvedValue({ id: 'a1', gameTitle: 'Elden Ring', dismissed: false });

    await checkForBombing('Elden Ring');

    expect(mockAlertCreate).not.toHaveBeenCalled();
  });
});

describe('getActiveAlerts', () => {
  it('returns only undismissed alerts ordered by detectedAt desc', async () => {
    const alerts = [
      { id: 'a1', type: 'review_bombing', gameTitle: 'Elden Ring', count: 5, dismissed: false },
    ];
    mockAlertFindMany.mockResolvedValue(alerts);

    const result = await getActiveAlerts();

    expect(mockAlertFindMany).toHaveBeenCalledWith({
      where: { dismissed: false },
      orderBy: { detectedAt: 'desc' },
    });
    expect(result).toEqual(alerts);
  });
});

describe('dismissAlert', () => {
  it('marks the alert dismissed and sets dismissedAt', async () => {
    const updated = { id: 'a1', dismissed: true, dismissedAt: new Date() };
    mockAlertUpdate.mockResolvedValue(updated);

    const result = await dismissAlert('a1');

    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { dismissed: true, dismissedAt: expect.any(Date) },
    });
    expect(result.dismissed).toBe(true);
  });
});
