jest.mock('@/lib/prisma', () => ({
  prisma: {
    gameFollow: { findMany: jest.fn() },
    user:       { findMany: jest.fn() },
  },
}));
jest.mock('@/lib/notificationPrefStore', () => ({ getPreferences: jest.fn() }));
jest.mock('@/lib/notificationStore',     () => ({ createNotification: jest.fn() }));

import { notifyGameFollowers } from '@/lib/gameFollowNotificationService';
import { prisma }              from '@/lib/prisma';
import { getPreferences }      from '@/lib/notificationPrefStore';
import { createNotification }  from '@/lib/notificationStore';

const mockFollowFindMany = prisma.gameFollow.findMany as jest.Mock;
const mockUserFindMany   = prisma.user.findMany       as jest.Mock;
const mockGetPrefs       = getPreferences             as jest.Mock;
const mockNotify         = createNotification         as jest.Mock;

const PREFS_ON  = { newFollower: true, tipReceived: true, commentOnReview: true, mention: true, newGameReview: true,  replyToComment: true };
const PREFS_OFF = { ...PREFS_ON, newGameReview: false };

beforeEach(() => {
  jest.resetAllMocks();
  mockFollowFindMany.mockResolvedValue([]);
  mockUserFindMany.mockResolvedValue([]);
  mockGetPrefs.mockResolvedValue(PREFS_ON);
  mockNotify.mockResolvedValue(undefined);
});

describe('notifyGameFollowers', () => {
  it('does nothing when no users follow the game', async () => {
    await notifyGameFollowers('Hades', 'r1', 'Darla#1');
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('notifies followers whose newGameReview pref is enabled', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Alice#1' }, { gamerTag: 'Bob#2' }]);

    await notifyGameFollowers('Hades', 'r1', 'Reviewer#1');

    expect(mockNotify).toHaveBeenCalledWith('Alice#1', 'new_game_review', 'Reviewer#1', 'r1', 'Hades');
    expect(mockNotify).toHaveBeenCalledWith('Bob#2',   'new_game_review', 'Reviewer#1', 'r1', 'Hades');
  });

  it('skips follower when newGameReview pref is disabled', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Alice#1' }, { gamerTag: 'Bob#2' }]);
    mockGetPrefs
      .mockResolvedValueOnce(PREFS_ON)
      .mockResolvedValueOnce(PREFS_OFF);

    await notifyGameFollowers('Hades', 'r1', 'Reviewer#1');

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('Alice#1', 'new_game_review', 'Reviewer#1', 'r1', 'Hades');
  });

  it('excludes the reviewer from notifications', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Darla#1' }, { gamerTag: 'Bob#2' }]);

    await notifyGameFollowers('Hades', 'r1', 'Darla#1');

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('Bob#2', 'new_game_review', 'Darla#1', 'r1', 'Hades');
  });

  it('does nothing when the only follower is the reviewer', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Darla#1' }]);

    await notifyGameFollowers('Hades', 'r1', 'Darla#1');

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('queries followers by gameTitle', async () => {
    await notifyGameFollowers('Elden Ring', 'r2', 'Reviewer#1');
    expect(mockFollowFindMany).toHaveBeenCalledWith({
      where:  { gameTitle: 'Elden Ring' },
      select: { userId: true },
    });
  });

  it('calls getPreferences with each follower tag', async () => {
    mockFollowFindMany.mockResolvedValue([{ userId: 'u1' }]);
    mockUserFindMany.mockResolvedValue([{ gamerTag: 'Alice#1' }]);

    await notifyGameFollowers('Hades', 'r1', 'Reviewer#1');

    expect(mockGetPrefs).toHaveBeenCalledWith('Alice#1');
  });
});
