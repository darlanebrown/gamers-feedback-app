const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { sendBombingEmail, sendClassificationEmail, sendFollowEmail, sendVoteEmail, sendReclassifyEmail, sendDigestEmail } from '@/lib/emailService';

beforeEach(() => {
  jest.resetAllMocks();
  process.env.RESEND_API_KEY       = 'test-key';
  process.env.MODERATOR_EMAIL      = 'mod@example.com';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
  (jest.requireMock('resend') as { Resend: jest.Mock }).Resend
    .mockImplementation(() => ({ emails: { send: mockSend } }));
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.MODERATOR_EMAIL;
  delete process.env.NEXT_PUBLIC_BASE_URL;
});

describe('sendBombingEmail', () => {
  it('sends an email to MODERATOR_EMAIL with game title and count', async () => {
    mockSend.mockResolvedValue({ id: 'email-1' });

    await sendBombingEmail('Elden Ring', 7);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'mod@example.com',
        subject: expect.stringContaining('Elden Ring'),
        html:    expect.stringContaining('7'),
      }),
    );
  });

  it('does nothing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    await sendBombingEmail('Elden Ring', 7);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing when MODERATOR_EMAIL is not set', async () => {
    delete process.env.MODERATOR_EMAIL;

    await sendBombingEmail('Elden Ring', 7);

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendClassificationEmail', () => {
  it('sends a toxic alert email with review link', async () => {
    mockSend.mockResolvedValue({ id: 'email-2' });

    await sendClassificationEmail('rev-1', 'Cyberpunk 2077', 'Darla#1', 'toxic');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'mod@example.com',
        subject: expect.stringMatching(/toxic/i),
        html:    expect.stringContaining('rev-1'),
      }),
    );
  });

  it('sends a spam alert email', async () => {
    mockSend.mockResolvedValue({ id: 'email-3' });

    await sendClassificationEmail('rev-2', 'FIFA 25', 'Bot#99', 'spam');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'mod@example.com',
        subject: expect.stringMatching(/spam/i),
      }),
    );
  });

  it('does nothing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    await sendClassificationEmail('rev-3', 'Game', 'User#1', 'spam');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendFollowEmail', () => {
  it('sends a follow notification to the followed user', async () => {
    mockSend.mockResolvedValue({ id: 'email-4' });

    await sendFollowEmail('player@test.com', 'Darla#1');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'player@test.com',
        subject: expect.stringMatching(/follow/i),
        html:    expect.stringContaining('Darla#1'),
      }),
    );
  });

  it('does nothing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    await sendFollowEmail('player@test.com', 'Darla#1');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendVoteEmail', () => {
  it('sends an upvote notification to the review author', async () => {
    mockSend.mockResolvedValue({ id: 'email-5' });

    await sendVoteEmail('author@test.com', 'Darla#1', 'Elden Ring', 'up');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'author@test.com',
        subject: expect.stringMatching(/upvote|vote/i),
        html:    expect.stringContaining('Elden Ring'),
      }),
    );
  });

  it('sends a downvote notification', async () => {
    mockSend.mockResolvedValue({ id: 'email-6' });

    await sendVoteEmail('author@test.com', 'Darla#1', 'FIFA 25', 'down');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'author@test.com',
        html:    expect.stringContaining('FIFA 25'),
      }),
    );
  });

  it('does nothing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    await sendVoteEmail('author@test.com', 'Darla#1', 'Game', 'up');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendReclassifyEmail', () => {
  it('sends a reclassify notification to the review author', async () => {
    mockSend.mockResolvedValue({ id: 'email-7' });

    await sendReclassifyEmail('author@test.com', 'Hades', 'helpful');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'author@test.com',
        subject: expect.stringMatching(/review|reclassif/i),
        html:    expect.stringContaining('Hades'),
      }),
    );
  });

  it('does nothing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    await sendReclassifyEmail('author@test.com', 'Hades', 'spam');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('sendDigestEmail', () => {
  it('sends a weekly digest with follower and vote counts', async () => {
    mockSend.mockResolvedValue({ id: 'email-8' });

    await sendDigestEmail('darla@test.com', 'Darla#1', {
      newFollowers: 3, upvotes: 7, downvotes: 1, totalReviews: 12,
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      'darla@test.com',
        subject: expect.stringMatching(/weekly|digest/i),
        html:    expect.stringContaining('3'),
      }),
    );
  });

  it('does nothing when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    await sendDigestEmail('darla@test.com', 'Darla#1', {
      newFollowers: 1, upvotes: 2, downvotes: 0, totalReviews: 5,
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
