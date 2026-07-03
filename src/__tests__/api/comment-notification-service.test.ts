jest.mock('@/lib/notificationPrefStore', () => ({ getPreferences: jest.fn() }));
jest.mock('@/lib/notificationStore',    () => ({ createNotification: jest.fn() }));

import { notifyCommentOnReview, notifyReplyToComment } from '@/lib/commentNotificationService';
import { getPreferences }    from '@/lib/notificationPrefStore';
import { createNotification } from '@/lib/notificationStore';

const mockGetPrefs = getPreferences     as jest.Mock;
const mockCreate   = createNotification as jest.Mock;

const PREFS_ALL_ON = {
  gamerTag: 'Author#1', newFollower: true, tipReceived: true,
  commentOnReview: true, mention: true, newGameReview: true, replyToComment: true,
};

beforeEach(() => {
  jest.resetAllMocks();
  mockGetPrefs.mockResolvedValue(PREFS_ALL_ON);
  mockCreate.mockResolvedValue(undefined);
});

// ── notifyCommentOnReview ─────────────────────────────────────────────────────

describe('notifyCommentOnReview', () => {
  it('looks up preferences for the review author', async () => {
    await notifyCommentOnReview('Author#1', 'Commenter#2', 'r1', 'Elden Ring');
    expect(mockGetPrefs).toHaveBeenCalledWith('Author#1');
  });

  it('creates notification when commentOnReview pref is enabled', async () => {
    await notifyCommentOnReview('Author#1', 'Commenter#2', 'r1', 'Elden Ring');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('creates notification with correct positional args', async () => {
    await notifyCommentOnReview('Author#1', 'Commenter#2', 'r1', 'Elden Ring');
    expect(mockCreate).toHaveBeenCalledWith('Author#1', 'comment', 'Commenter#2', 'r1', 'Elden Ring');
  });

  it('skips notification when commentOnReview pref is false', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_ALL_ON, commentOnReview: false });
    await notifyCommentOnReview('Author#1', 'Commenter#2', 'r1', 'Elden Ring');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns void', async () => {
    expect(await notifyCommentOnReview('Author#1', 'Commenter#2', 'r1', 'Elden Ring')).toBeUndefined();
  });
});

// ── notifyReplyToComment ──────────────────────────────────────────────────────

describe('notifyReplyToComment', () => {
  it('looks up preferences for the comment author', async () => {
    await notifyReplyToComment('Author#1', 'Replier#3', 'r1');
    expect(mockGetPrefs).toHaveBeenCalledWith('Author#1');
  });

  it('creates notification when replyToComment pref is enabled', async () => {
    await notifyReplyToComment('Author#1', 'Replier#3', 'r1');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('creates notification with correct positional args', async () => {
    await notifyReplyToComment('Author#1', 'Replier#3', 'r1');
    expect(mockCreate).toHaveBeenCalledWith('Author#1', 'reply', 'Replier#3', 'r1');
  });

  it('skips notification when replyToComment pref is false', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_ALL_ON, replyToComment: false });
    await notifyReplyToComment('Author#1', 'Replier#3', 'r1');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns void when skipped', async () => {
    mockGetPrefs.mockResolvedValue({ ...PREFS_ALL_ON, replyToComment: false });
    expect(await notifyReplyToComment('Author#1', 'Replier#3', 'r1')).toBeUndefined();
  });
});
