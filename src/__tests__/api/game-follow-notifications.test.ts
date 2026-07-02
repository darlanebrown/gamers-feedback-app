jest.mock('@/lib/prisma', () => ({
  prisma: {
    gameFollow:   { findMany: jest.fn() },
    user:         { findMany: jest.fn() },
    notification: { createMany: jest.fn() },
  },
}));

import { notifyGameFollowers } from '@/lib/gameFollowNotificationService';
import { prisma } from '@/lib/prisma';

const mockFollowFindMany        = prisma.gameFollow.findMany   as jest.Mock;
const mockUserFindMany          = prisma.user.findMany         as jest.Mock;
const mockNotificationCreateMany = prisma.notification.createMany as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockFollowFindMany.mockResolvedValue([]);
  mockUserFindMany.mockResolvedValue([]);
  mockNotificationCreateMany.mockResolvedValue({ count: 0 });
});

describe('notifyGameFollowers', () => {
  it('does nothing when no users follow the game', async () => {
    mockFollowFindMany.mockResolvedValue([]);
    await notifyGameFollowers('Hades', 'r1', 'Darla#1');
    expect(mockNotificationCreateMany).not.toHaveBeenCalled();
  });

  it('notifies all followers with new_game_review notification', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Alice#1' }, { gamerTag: 'Bob#2' }]);

    await notifyGameFollowers('Hades', 'r1', 'Reviewer#1');

    expect(mockNotificationCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userTag: 'Alice#1', type: 'new_game_review', reviewId: 'r1', gameTitle: 'Hades', actorTag: 'Reviewer#1' }),
        expect.objectContaining({ userTag: 'Bob#2',  type: 'new_game_review', reviewId: 'r1', gameTitle: 'Hades', actorTag: 'Reviewer#1' }),
      ]),
    });
  });

  it('excludes the reviewer from notifications', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Darla#1' }, { gamerTag: 'Bob#2' }]);

    await notifyGameFollowers('Hades', 'r1', 'Darla#1');

    const call = mockNotificationCreateMany.mock.calls[0][0];
    expect(call.data).toHaveLength(1);
    expect(call.data[0].userTag).toBe('Bob#2');
  });

  it('does nothing when the only follower is the reviewer', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Darla#1' }]);

    await notifyGameFollowers('Hades', 'r1', 'Darla#1');

    expect(mockNotificationCreateMany).not.toHaveBeenCalled();
  });

  it('queries followers by gameTitle', async () => {
    await notifyGameFollowers('Elden Ring', 'r2', 'Reviewer#1');
    expect(mockFollowFindMany).toHaveBeenCalledWith({
      where:  { gameTitle: 'Elden Ring' },
      select: { userId: true },
    });
  });
});
