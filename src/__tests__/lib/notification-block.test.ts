jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { create: jest.fn() },
  },
}));
jest.mock('@/lib/blockStore', () => ({
  isBlocking: jest.fn(),
}));

import { createNotification } from '@/lib/notificationStore';
import { prisma }             from '@/lib/prisma';
import { isBlocking }         from '@/lib/blockStore';

const mockCreate     = (prisma.notification.create as jest.Mock);
const mockIsBlocking = isBlocking as jest.Mock;

const NOTIFICATION_ROW = {
  id: 'n1', userTag: 'Recipient#1', type: 'follow', actorTag: 'Actor#2',
  reviewId: null, gameTitle: null, read: false, createdAt: new Date(),
};

beforeEach(() => {
  jest.resetAllMocks();
  mockCreate.mockResolvedValue(NOTIFICATION_ROW);
  mockIsBlocking.mockResolvedValue(false);
});

describe('createNotification — block gate', () => {
  it('creates the notification when actor is not blocked', async () => {
    await createNotification('Recipient#1', 'follow', 'Actor#2');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('checks whether recipient has blocked the actor', async () => {
    await createNotification('Recipient#1', 'follow', 'Actor#2');
    expect(mockIsBlocking).toHaveBeenCalledWith('Recipient#1', 'Actor#2');
  });

  it('skips the notification when actor is blocked by recipient', async () => {
    mockIsBlocking.mockResolvedValue(true);
    await createNotification('Recipient#1', 'follow', 'Actor#2');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns null when notification is skipped due to block', async () => {
    mockIsBlocking.mockResolvedValue(true);
    const result = await createNotification('Recipient#1', 'vote_up', 'Actor#2');
    expect(result).toBeNull();
  });

  it('skips the block check when there is no actorTag', async () => {
    await createNotification('Recipient#1', 'reclassify');
    expect(mockIsBlocking).not.toHaveBeenCalled();
  });

  it('creates the notification when there is no actorTag (system event)', async () => {
    await createNotification('Recipient#1', 'reclassify');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('passes all args through to prisma when not blocked', async () => {
    await createNotification('Recipient#1', 'comment', 'Actor#2', 'rev-1', 'Elden Ring');
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userTag: 'Recipient#1', type: 'comment', actorTag: 'Actor#2', reviewId: 'rev-1', gameTitle: 'Elden Ring' },
    });
  });

  it('skips for tip type when actor is blocked', async () => {
    mockIsBlocking.mockResolvedValue(true);
    await createNotification('Recipient#1', 'tip', 'Actor#2');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('skips for mention type when actor is blocked', async () => {
    mockIsBlocking.mockResolvedValue(true);
    await createNotification('Recipient#1', 'mention', 'Actor#2');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
