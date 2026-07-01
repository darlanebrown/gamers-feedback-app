jest.mock('@/lib/prisma', () => ({
  prisma: {
    draft: {
      findUnique:  jest.fn(),
      upsert:      jest.fn(),
      deleteMany:  jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getDraft, upsertDraft, deleteDraft } from '@/lib/draftStore';

const mockFindUnique = prisma.draft.findUnique as jest.Mock;
const mockUpsert     = prisma.draft.upsert     as jest.Mock;
const mockDeleteMany = prisma.draft.deleteMany  as jest.Mock;

const DRAFT = {
  id: 'd1', reviewerTag: 'Darla#1', gameTitle: 'Elden Ring',
  platform: 'PC', rating: 9, headline: 'Great game',
  body: 'Really enjoyed every moment of it.',
  pros: 'Combat', cons: 'Difficulty', playtime: '80h',
  updatedAt: new Date(),
};

beforeEach(() => jest.resetAllMocks());

describe('getDraft', () => {
  it('queries by reviewerTag and returns the draft', async () => {
    mockFindUnique.mockResolvedValue(DRAFT);
    const result = await getDraft('Darla#1');
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { reviewerTag: 'Darla#1' } });
    expect(result?.gameTitle).toBe('Elden Ring');
  });

  it('returns null when no draft exists', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getDraft('Darla#1');
    expect(result).toBeNull();
  });
});

describe('upsertDraft', () => {
  it('creates a new draft when none exists', async () => {
    mockUpsert.mockResolvedValue(DRAFT);
    const result = await upsertDraft('Darla#1', { gameTitle: 'Elden Ring', rating: 9 });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { reviewerTag: 'Darla#1' },
      create: { reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', rating: 9 },
      update: { gameTitle: 'Elden Ring', rating: 9 },
    });
    expect(result.reviewerTag).toBe('Darla#1');
  });

  it('updates an existing draft', async () => {
    const updated = { ...DRAFT, headline: 'Updated headline' };
    mockUpsert.mockResolvedValue(updated);
    const result = await upsertDraft('Darla#1', { headline: 'Updated headline' });
    expect(result.headline).toBe('Updated headline');
  });
});

describe('deleteDraft', () => {
  it('deletes the draft by reviewerTag', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await deleteDraft('Darla#1');
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { reviewerTag: 'Darla#1' } });
  });

  it('does not throw when no draft exists to delete', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteDraft('NoUser#1')).resolves.not.toThrow();
  });
});
