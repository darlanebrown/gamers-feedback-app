jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from '@/lib/notificationStore';

const mockCreate     = prisma.notification.create     as jest.Mock;
const mockFindMany   = prisma.notification.findMany   as jest.Mock;
const mockCount      = prisma.notification.count      as jest.Mock;
const mockUpdateMany = prisma.notification.updateMany as jest.Mock;
const mockUpdate     = prisma.notification.update     as jest.Mock;

beforeEach(() => jest.resetAllMocks());

const NOTIF = {
  id: 'n1', userTag: 'Darla#1', type: 'follow',
  actorTag: 'Gamer#2', reviewId: null, gameTitle: null,
  read: false, createdAt: new Date(),
};

describe('createNotification', () => {
  it('creates a notification with all fields', async () => {
    mockCreate.mockResolvedValue(NOTIF);
    const result = await createNotification('Darla#1', 'follow', 'Gamer#2');
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userTag: 'Darla#1', type: 'follow', actorTag: 'Gamer#2', reviewId: undefined, gameTitle: undefined },
    });
    expect(result.type).toBe('follow');
  });
});

describe('getNotifications', () => {
  it('returns notifications ordered newest first with default skip/take', async () => {
    mockFindMany.mockResolvedValue([NOTIF]);
    const result = await getNotifications('Darla#1');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userTag: 'Darla#1' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(result).toHaveLength(1);
  });
});

describe('getUnreadCount', () => {
  it('counts only unread notifications for the user', async () => {
    mockCount.mockResolvedValue(3);
    const count = await getUnreadCount('Darla#1');
    expect(mockCount).toHaveBeenCalledWith({ where: { userTag: 'Darla#1', read: false } });
    expect(count).toBe(3);
  });
});

describe('markAllRead', () => {
  it('marks all unread notifications for user as read', async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });
    await markAllRead('Darla#1');
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userTag: 'Darla#1', read: false },
      data: { read: true },
    });
  });
});

describe('markRead', () => {
  it('marks a single notification as read', async () => {
    mockUpdate.mockResolvedValue({ ...NOTIF, read: true });
    await markRead('n1');
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { read: true } });
  });
});
