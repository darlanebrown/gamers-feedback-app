jest.mock('openai', () => ({
  OpenAI: jest.fn(),
  __esModule: true,
}));

jest.mock('@/lib/reviewStore', () => ({
  storeEmbedding: jest.fn(),
}));

import { OpenAI } from 'openai';
import { storeEmbedding } from '@/lib/reviewStore';
import { buildReviewText, generateEmbedding, embedAndStore } from '@/lib/embeddingService';

const MockOpenAI    = OpenAI as unknown as jest.Mock;
const mockCreate    = jest.fn();
const mockStore     = storeEmbedding as jest.Mock;

const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

beforeEach(() => {
  jest.resetAllMocks();
  process.env.OPENAI_API_KEY = 'test-key';
  MockOpenAI.mockImplementation(() => ({
    embeddings: { create: mockCreate },
  }));
  mockCreate.mockResolvedValue({ data: [{ embedding: FAKE_EMBEDDING }] });
  mockStore.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe('buildReviewText', () => {
  it('concatenates game title, headline, body, pros, and cons', () => {
    const text = buildReviewText({
      gameTitle: 'Elden Ring',
      headline:  'A masterpiece',
      body:      'Stunning open world.',
      pros:      'Great combat',
      cons:      'Very hard',
    });
    expect(text).toContain('Elden Ring');
    expect(text).toContain('A masterpiece');
    expect(text).toContain('Stunning open world.');
    expect(text).toContain('Great combat');
    expect(text).toContain('Very hard');
  });

  it('handles empty pros and cons without crashing', () => {
    expect(() =>
      buildReviewText({ gameTitle: 'G', headline: 'H', body: 'B', pros: '', cons: '' })
    ).not.toThrow();
  });
});

describe('generateEmbedding', () => {
  it('calls OpenAI embeddings.create with text-embedding-3-small', async () => {
    await generateEmbedding('Is Elden Ring worth it?');
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'Is Elden Ring worth it?',
    });
  });

  it('returns the embedding vector as a number array', async () => {
    const result = await generateEmbedding('test');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1536);
    expect(typeof result[0]).toBe('number');
  });
});

describe('embedAndStore', () => {
  const review = {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Perfect roguelite', body: 'Incredible loop.',
    pros: 'Combat', cons: 'Repetitive', playtime: '40h',
    reviewerTag: 'Darla#1', classification: 'helpful' as const,
    createdAt: new Date().toISOString(),
  };

  it('builds review text, generates embedding, and stores it', async () => {
    await embedAndStore(review);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockStore).toHaveBeenCalledWith('r1', FAKE_EMBEDDING);
  });
});
