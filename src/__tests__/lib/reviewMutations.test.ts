jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findUnique: jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { updateReview, deleteReview } from '@/lib/reviewStore';

const mockFindUnique = prisma.review.findUnique as jest.Mock;
const mockUpdate     = prisma.review.update     as jest.Mock;
const mockDelete     = prisma.review.delete     as jest.Mock;

const BASE_ROW = {
  id: 'r1', gameTitle: 'Elden Ring', platform: 'PC', rating: 9,
  headline: 'Great', body: 'Really good', pros: 'Fun', cons: 'Hard',
  playtime: '100h', reviewerTag: 'Darla#1', classification: 'helpful',
  classificationReason: null, createdAt: new Date('2026-01-01'),
};

beforeEach(() => {
  jest.resetAllMocks();
  mockFindUnique.mockResolvedValue(BASE_ROW);
  mockUpdate.mockResolvedValue({ ...BASE_ROW, classification: 'pending' });
  mockDelete.mockResolvedValue(BASE_ROW);
});

describe('updateReview', () => {
  it('returns null when review does not belong to reviewer', async () => {
    mockFindUnique.mockResolvedValue({ ...BASE_ROW, reviewerTag: 'Other#1' });
    const result = await updateReview('r1', 'Darla#1', { headline: 'New headline' });
    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('resets classification to pending on update', async () => {
    await updateReview('r1', 'Darla#1', { headline: 'Updated' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ classification: 'pending' }),
      }),
    );
  });
});

describe('deleteReview', () => {
  it('returns false when review does not belong to reviewer', async () => {
    mockFindUnique.mockResolvedValue({ ...BASE_ROW, reviewerTag: 'Other#1' });
    const result = await deleteReview('r1', 'Darla#1');
    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes and returns true when reviewer matches', async () => {
    const result = await deleteReview('r1', 'Darla#1');
    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
