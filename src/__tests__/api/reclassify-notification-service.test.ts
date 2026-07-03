jest.mock('@/lib/notificationStore',     () => ({ createNotification: jest.fn() }));
jest.mock('@/lib/notificationPrefStore', () => ({ getPreferences: jest.fn() }));

import { notifyReclassify } from '@/lib/reclassifyNotificationService';
import { createNotification } from '@/lib/notificationStore';
import { getPreferences }     from '@/lib/notificationPrefStore';

const mockNotify   = createNotification as jest.Mock;
const mockGetPrefs = getPreferences     as jest.Mock;

const PREFS_ON  = { newFollower: true, tipReceived: true, commentOnReview: true, mention: true, newGameReview: true, replyToComment: true, voteOnReview: true, reclassify: true  };
const PREFS_OFF = { ...PREFS_ON, reclassify: false };

beforeEach(() => {
  jest.resetAllMocks();
  mockNotify.mockResolvedValue(undefined);
  mockGetPrefs.mockResolvedValue(PREFS_ON);
});

describe('notifyReclassify', () => {
  it('creates a reclassify notification when pref is enabled', async () => {
    await notifyReclassify('Reviewer#1', 'r1', 'Hades');
    expect(mockNotify).toHaveBeenCalledWith('Reviewer#1', 'reclassify', undefined, 'r1', 'Hades');
  });

  it('skips notification when reclassify pref is disabled', async () => {
    mockGetPrefs.mockResolvedValue(PREFS_OFF);
    await notifyReclassify('Reviewer#1', 'r1', 'Hades');
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('calls getPreferences with the reviewer tag', async () => {
    await notifyReclassify('Reviewer#1', 'r1', 'Hades');
    expect(mockGetPrefs).toHaveBeenCalledWith('Reviewer#1');
  });
});
