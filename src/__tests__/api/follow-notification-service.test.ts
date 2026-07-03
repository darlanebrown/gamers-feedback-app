jest.mock('@/lib/notificationPrefStore', () => ({ getPreferences: jest.fn() }));
jest.mock('@/lib/notificationStore',    () => ({ createNotification: jest.fn() }));

import { notifyNewFollower } from '@/lib/followNotificationService';
import { getPreferences }    from '@/lib/notificationPrefStore';
import { createNotification } from '@/lib/notificationStore';

const mockGetPrefs = getPreferences     as jest.Mock;
const mockCreate   = createNotification as jest.Mock;

const PREFS_ON  = { gamerTag: 'Player#99', newFollower: true,  tipReceived: true, commentOnReview: true, mention: true, newGameReview: true, replyToComment: true };
const PREFS_OFF = { ...PREFS_ON, newFollower: false };

beforeEach(() => {
  jest.resetAllMocks();
  mockGetPrefs.mockResolvedValue(PREFS_ON);
  mockCreate.mockResolvedValue(undefined);
});

describe('notifyNewFollower', () => {
  it('looks up preferences for the person being followed', async () => {
    await notifyNewFollower('Player#99', 'Darla#1');
    expect(mockGetPrefs).toHaveBeenCalledWith('Player#99');
  });

  it('creates a notification when newFollower pref is enabled', async () => {
    await notifyNewFollower('Player#99', 'Darla#1');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('creates notification with type "follow" and correct positional args', async () => {
    await notifyNewFollower('Player#99', 'Darla#1');
    expect(mockCreate).toHaveBeenCalledWith('Player#99', 'follow', 'Darla#1');
  });

  it('skips notification when newFollower pref is false', async () => {
    mockGetPrefs.mockResolvedValue(PREFS_OFF);
    await notifyNewFollower('Player#99', 'Darla#1');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('notification is for the followingTag (person followed), not followerTag', async () => {
    await notifyNewFollower('Player#99', 'Darla#1');
    const [userTag, , actorTag] = mockCreate.mock.calls[0];
    expect(userTag).toBe('Player#99');
    expect(actorTag).toBe('Darla#1');
  });

  it('returns void when notification is sent', async () => {
    expect(await notifyNewFollower('Player#99', 'Darla#1')).toBeUndefined();
  });

  it('returns void when notification is skipped', async () => {
    mockGetPrefs.mockResolvedValue(PREFS_OFF);
    expect(await notifyNewFollower('Player#99', 'Darla#1')).toBeUndefined();
  });

  it('does not create notification for other disabled prefs', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_OFF, tipReceived: true, commentOnReview: true });
    await notifyNewFollower('Player#99', 'Darla#1');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
