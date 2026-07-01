const mockFetch = jest.fn();
global.fetch = mockFetch;

import { sendBombingWebhook, sendClassificationWebhook, sendFlagWebhook } from '@/lib/webhookService';

beforeEach(() => {
  jest.resetAllMocks();
  process.env.MODERATOR_WEBHOOK_URL = 'https://hooks.example.com/notify';
  process.env.NEXT_PUBLIC_BASE_URL  = 'https://example.com';
});

afterEach(() => {
  delete process.env.MODERATOR_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_BASE_URL;
});

describe('sendBombingWebhook', () => {
  it('POSTs a JSON payload to MODERATOR_WEBHOOK_URL', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendBombingWebhook('Elden Ring', 7);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.example.com/notify',
      expect.objectContaining({
        method:  'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body:    expect.stringContaining('Elden Ring'),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('review_bombing');
    expect(body.count).toBe(7);
    expect(body.gameTitle).toBe('Elden Ring');
  });

  it('does nothing when MODERATOR_WEBHOOK_URL is not set', async () => {
    delete process.env.MODERATOR_WEBHOOK_URL;

    await sendBombingWebhook('Elden Ring', 7);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('sendClassificationWebhook', () => {
  it('POSTs a toxic classification payload with review link', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendClassificationWebhook('rev-1', 'Cyberpunk 2077', 'Darla#1', 'toxic');

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('classification_alert');
    expect(body.classification).toBe('toxic');
    expect(body.reviewId).toBe('rev-1');
    expect(body.gameTitle).toBe('Cyberpunk 2077');
    expect(body.reviewerTag).toBe('Darla#1');
    expect(body.reviewUrl).toContain('rev-1');
  });

  it('POSTs a spam classification payload', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendClassificationWebhook('rev-2', 'FIFA 25', 'Bot#99', 'spam');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.classification).toBe('spam');
  });

  it('does nothing when MODERATOR_WEBHOOK_URL is not set', async () => {
    delete process.env.MODERATOR_WEBHOOK_URL;

    await sendClassificationWebhook('rev-3', 'Game', 'User#1', 'spam');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('sendFlagWebhook', () => {
  it('POSTs a flag payload with review and reporter details', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendFlagWebhook('r1', 'Elden Ring', 'Player#99', 'Darla#1');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('review_flag');
    expect(body.reviewId).toBe('r1');
    expect(body.gameTitle).toBe('Elden Ring');
    expect(body.reviewerTag).toBe('Player#99');
    expect(body.reporterTag).toBe('Darla#1');
    expect(body.reviewUrl).toContain('r1');
  });

  it('does nothing when MODERATOR_WEBHOOK_URL is not set', async () => {
    delete process.env.MODERATOR_WEBHOOK_URL;

    await sendFlagWebhook('r1', 'Elden Ring', 'Player#99', 'Darla#1');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
