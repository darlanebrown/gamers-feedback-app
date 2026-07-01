const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { sendBombingEmail, sendClassificationEmail } from '@/lib/emailService';

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
