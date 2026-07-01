jest.mock('@/lib/reviewStore', () => ({
  updateReviewClassification: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/classify/route';
import { updateReviewClassification } from '@/lib/reviewStore';

const mockUpdate = updateReviewClassification as jest.Mock;

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/classify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.OPENAI_API_KEY;
});

describe('POST /api/classify — validation', () => {
  it('returns 400 when reviewId is missing', async () => {
    const res = await POST(makeRequest({ headline: 'h', body: 'b' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing/i);
  });

  it('returns 400 when headline is missing', async () => {
    const res = await POST(makeRequest({ reviewId: 'r1', body: 'b' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is missing', async () => {
    const res = await POST(makeRequest({ reviewId: 'r1', headline: 'h' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/classify — rule-based (no OPENAI_API_KEY)', () => {
  it('classifies spam and persists it', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const res = await POST(makeRequest({
      reviewId: 'r1',
      headline: 'Big discount available',
      body: 'Check the giveaway for free stuff',
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.classification).toBe('spam');
    expect(json.method).toBe('rule-based');
    expect(mockUpdate).toHaveBeenCalledWith('r1', 'spam', expect.any(String));
  });

  it('classifies toxic and persists it', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const res = await POST(makeRequest({
      reviewId: 'r2',
      headline: 'Garbage game',
      body: 'The devs are idiots who ruined the franchise',
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.classification).toBe('toxic');
    expect(mockUpdate).toHaveBeenCalledWith('r2', 'toxic', expect.any(String));
  });

  it('classifies genuine reviews as helpful and persists it', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const res = await POST(makeRequest({
      reviewId: 'r3',
      headline: 'A stunning achievement',
      body: 'Elden Ring sets a new bar for open world design.',
      pros: 'Incredible boss fights',
      cons: 'Brutal difficulty curve',
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.classification).toBe('helpful');
    expect(mockUpdate).toHaveBeenCalledWith('r3', 'helpful', expect.any(String));
  });

  it('handles missing optional fields (pros/cons) without crashing', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const res = await POST(makeRequest({
      reviewId: 'r4',
      headline: 'Short review',
      body: 'Pretty good game overall.',
    }));
    expect(res.status).toBe(200);
  });
});
