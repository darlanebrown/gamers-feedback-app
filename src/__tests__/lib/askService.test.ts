jest.mock('openai', () => ({
  OpenAI: jest.fn(),
  __esModule: true,
}));

jest.mock('@/lib/embeddingService', () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  findSimilarReviews: jest.fn(),
}));

import { OpenAI } from 'openai';
import { generateEmbedding } from '@/lib/embeddingService';
import { findSimilarReviews } from '@/lib/reviewStore';
import { askQuestion } from '@/lib/askService';

const MockOpenAI          = OpenAI as unknown as jest.Mock;
const mockChatCreate      = jest.fn();
const mockGenerateEmbedding = generateEmbedding as jest.Mock;
const mockFindSimilar     = findSimilarReviews as jest.Mock;

const FAKE_EMBEDDING = [0.1, 0.2, 0.3];
const FAKE_REVIEWS = [
  {
    id: 'r1', gameTitle: 'Elden Ring', platform: 'PC', rating: 9,
    headline: 'Masterpiece', body: 'Stunning world.',
    pros: 'Combat', cons: 'Hard', playtime: '100h',
    reviewerTag: 'Gamer#1', classification: 'helpful',
    createdAt: new Date().toISOString(),
  },
];

beforeEach(() => {
  jest.resetAllMocks();
  process.env.OPENAI_API_KEY = 'test-key';
  MockOpenAI.mockImplementation(() => ({
    chat: { completions: { create: mockChatCreate } },
  }));
  mockChatCreate.mockResolvedValue({
    choices: [{ message: { content: 'Yes, Elden Ring is worth it.' } }],
  });
  mockGenerateEmbedding.mockResolvedValue(FAKE_EMBEDDING);
  mockFindSimilar.mockResolvedValue(FAKE_REVIEWS);
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe('askQuestion', () => {
  it('returns fallback message when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await askQuestion('Is Elden Ring good?');
    expect(result.answer).toMatch(/api key/i);
    expect(result.sources).toEqual([]);
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it('embeds the question and finds similar reviews', async () => {
    await askQuestion('Is Elden Ring good?');
    expect(mockGenerateEmbedding).toHaveBeenCalledWith('Is Elden Ring good?');
    expect(mockFindSimilar).toHaveBeenCalledWith(FAKE_EMBEDDING, 5);
  });

  it('returns no-results message when no similar reviews found', async () => {
    mockFindSimilar.mockResolvedValue([]);
    const result = await askQuestion('Is some obscure game good?');
    expect(result.answer).toMatch(/no relevant/i);
    expect(result.sources).toEqual([]);
    expect(mockChatCreate).not.toHaveBeenCalled();
  });

  it('synthesizes answer using gpt-4o-mini', async () => {
    await askQuestion('Is Elden Ring worth it?');
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' }),
    );
  });

  it('returns answer text and source reviews', async () => {
    const result = await askQuestion('Is Elden Ring good?');
    expect(result.answer).toBe('Yes, Elden Ring is worth it.');
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].gameTitle).toBe('Elden Ring');
  });
});
