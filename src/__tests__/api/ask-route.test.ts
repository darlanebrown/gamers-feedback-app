jest.mock('@/lib/askService', () => ({
  askQuestion: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/ask/route';
import { askQuestion } from '@/lib/askService';

const mockAskQuestion = askQuestion as jest.Mock;

const RESULT = {
  answer: 'Yes, Elden Ring is worth it on PC.',
  sources: [
    {
      id: 'r1', gameTitle: 'Elden Ring', platform: 'PC', rating: 9,
      headline: 'Masterpiece', body: 'Great game.',
      pros: 'Combat', cons: 'Hard', playtime: '100h',
      reviewerTag: 'Gamer#1', classification: 'helpful',
      createdAt: new Date().toISOString(),
    },
  ],
};

beforeEach(() => {
  jest.resetAllMocks();
  mockAskQuestion.mockResolvedValue(RESULT);
});

describe('GET /api/ask', () => {
  it('returns 400 when q param is missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/ask'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it('returns 400 when q is empty string', async () => {
    const res = await GET(new NextRequest('http://localhost/api/ask?q='));
    expect(res.status).toBe(400);
  });

  it('calls askQuestion with the q param and returns 200', async () => {
    const res = await GET(new NextRequest('http://localhost/api/ask?q=Is+Elden+Ring+good'));
    expect(res.status).toBe(200);
    expect(mockAskQuestion).toHaveBeenCalledWith('Is Elden Ring good');
  });

  it('returns answer and sources in the response body', async () => {
    const res = await GET(new NextRequest('http://localhost/api/ask?q=test'));
    const body = await res.json();
    expect(body.answer).toBe('Yes, Elden Ring is worth it on PC.');
    expect(body.sources).toHaveLength(1);
  });

  it('returns 500 when askQuestion throws', async () => {
    mockAskQuestion.mockRejectedValue(new Error('OpenAI error'));
    const res = await GET(new NextRequest('http://localhost/api/ask?q=test'));
    expect(res.status).toBe(500);
  });
});
