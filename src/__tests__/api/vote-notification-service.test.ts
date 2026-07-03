jest.mock('@/lib/notificationStore',     () => ({ createNotification: jest.fn() }));
jest.mock('@/lib/notificationPrefStore', () => ({ getPreferences: jest.fn() }));

import { notifyVoteOnReview } from '@/lib/voteNotificationService';
import { createNotification } from '@/lib/notificationStore';
import { getPreferences }     from '@/lib/notificationPrefStore';

const mockNotify   = createNotification as jest.Mock;
const mockGetPrefs = getPreferences     as jest.Mock;

const PREFS_ON  = { newFollower: true, tipReceived: true, commentOnReview: true, mention: true, newGameReview: true, replyToComment: true, voteOnReview: true  };
const PREFS_OFF = { ...PREFS_ON, voteOnReview: false };

beforeEach(() => {
  jest.resetAllMocks();
  mockNotify.mockResolvedValue(undefined);
  mockGetPrefs.mockResolvedValue(PREFS_ON);
});

describe('notifyVoteOnReview', () => {
  it('creates a vote_up notification when pref is enabled', async () => {
    await notifyVoteOnReview('Reviewer#1', 'Voter#2', 'r1', 'Hades', 'up');
    expect(mockNotify).toHaveBeenCalledWith('Reviewer#1', 'vote_up', 'Voter#2', 'r1', 'Hades');
  });

  it('creates a vote_down notification when pref is enabled', async () => {
    await notifyVoteOnReview('Reviewer#1', 'Voter#2', 'r1', 'Hades', 'down');
    expect(mockNotify).toHaveBeenCalledWith('Reviewer#1', 'vote_down', 'Voter#2', 'r1', 'Hades');
  });

  it('skips notification when voteOnReview pref is disabled', async () => {
    mockGetPrefs.mockResolvedValue(PREFS_OFF);
    await notifyVoteOnReview('Reviewer#1', 'Voter#2', 'r1', 'Hades', 'up');
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('calls getPreferences with the reviewer tag', async () => {
    await notifyVoteOnReview('Reviewer#1', 'Voter#2', 'r1', 'Hades', 'up');
    expect(mockGetPrefs).toHaveBeenCalledWith('Reviewer#1');
  });
});
