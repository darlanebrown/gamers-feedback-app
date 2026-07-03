jest.mock('@/lib/notificationPrefStore', () => ({
  getPreferences: jest.fn(),
}));
jest.mock('@/lib/notificationStore', () => ({
  createNotification: jest.fn(),
}));

import { notifyTipReceived } from '@/lib/tipNotificationService';
import { getPreferences }    from '@/lib/notificationPrefStore';
import { createNotification } from '@/lib/notificationStore';

const mockGetPrefs = getPreferences     as jest.Mock;
const mockCreate   = createNotification as jest.Mock;

const PREFS_ENABLED = {
  gamerTag: 'Creator#5', newFollower: true, tipReceived: true,
  commentOnReview: true, mention: true, newGameReview: true, replyToComment: true,
};

beforeEach(() => {
  jest.resetAllMocks();
  mockGetPrefs.mockResolvedValue(PREFS_ENABLED);
  mockCreate.mockResolvedValue(undefined);
});

describe('notifyTipReceived', () => {
  it('looks up preferences for the recipient', async () => {
    await notifyTipReceived('Creator#5', 'Darla#1');
    expect(mockGetPrefs).toHaveBeenCalledWith('Creator#5');
  });

  it('creates a notification when tipReceived pref is enabled', async () => {
    await notifyTipReceived('Creator#5', 'Darla#1');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('creates notification with correct positional args', async () => {
    await notifyTipReceived('Creator#5', 'Darla#1');
    expect(mockCreate).toHaveBeenCalledWith('Creator#5', 'tip', 'Darla#1');
  });

  it('skips notification when tipReceived pref is false', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_ENABLED, tipReceived: false });
    await notifyTipReceived('Creator#5', 'Darla#1');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not fire for other prefs being true when tipReceived is false', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_ENABLED, tipReceived: false, newFollower: true });
    await notifyTipReceived('Creator#5', 'Darla#1');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns void when notification is sent', async () => {
    const result = await notifyTipReceived('Creator#5', 'Darla#1');
    expect(result).toBeUndefined();
  });

  it('returns void when notification is skipped', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_ENABLED, tipReceived: false });
    const result = await notifyTipReceived('Creator#5', 'Darla#1');
    expect(result).toBeUndefined();
  });

  it('scopes prefs lookup and notification to recipientTag, not senderTag', async () => {
    await notifyTipReceived('Creator#5', 'Darla#1');
    expect(mockGetPrefs).toHaveBeenCalledWith('Creator#5');
    const [userTag, , actorTag] = mockCreate.mock.calls[0];
    expect(userTag).toBe('Creator#5');
    expect(actorTag).toBe('Darla#1');
  });
});
