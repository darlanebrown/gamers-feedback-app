jest.mock('@/lib/prisma', () => ({
  prisma: {
    collection: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      delete:     jest.fn(),
    },
    collectionItem: {
      create:   jest.fn(),
      delete:   jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import {
  createCollection,
  getCollections,
  deleteCollection,
  addItemToCollection,
  removeItemFromCollection,
  getCollectionItems,
} from '@/lib/collectionStore';
import { prisma } from '@/lib/prisma';

const mockColCreate     = (prisma.collection     as any).create     as jest.Mock;
const mockColFindMany   = (prisma.collection     as any).findMany   as jest.Mock;
const mockColFindUnique = (prisma.collection     as any).findUnique as jest.Mock;
const mockColDelete     = (prisma.collection     as any).delete     as jest.Mock;
const mockItemCreate    = (prisma.collectionItem as any).create     as jest.Mock;
const mockItemDelete    = (prisma.collectionItem as any).delete     as jest.Mock;
const mockItemFindMany  = (prisma.collectionItem as any).findMany   as jest.Mock;

beforeEach(() => jest.resetAllMocks());

const COL  = { id: 'col1', ownerTag: 'Darla#1', name: 'RPGs', createdAt: new Date() };
const ITEM = { id: 'item1', collectionId: 'col1', reviewId: 'r1', createdAt: new Date() };

describe('createCollection', () => {
  it('creates a collection and returns it', async () => {
    mockColCreate.mockResolvedValue(COL);

    const result = await createCollection('Darla#1', 'RPGs');

    expect(mockColCreate).toHaveBeenCalledWith({
      data: { ownerTag: 'Darla#1', name: 'RPGs' },
    });
    expect(result).toEqual(COL);
  });
});

describe('getCollections', () => {
  it('returns all collections for a user', async () => {
    mockColFindMany.mockResolvedValue([COL]);

    const result = await getCollections('Darla#1');

    expect(mockColFindMany).toHaveBeenCalledWith({
      where:   { ownerTag: 'Darla#1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([COL]);
  });

  it('returns empty array when user has no collections', async () => {
    mockColFindMany.mockResolvedValue([]);
    const result = await getCollections('Darla#1');
    expect(result).toEqual([]);
  });
});

describe('deleteCollection', () => {
  it('deletes when requester is the owner and returns true', async () => {
    mockColFindUnique.mockResolvedValue(COL);
    mockColDelete.mockResolvedValue(COL);

    const result = await deleteCollection('col1', 'Darla#1');

    expect(mockColDelete).toHaveBeenCalledWith({ where: { id: 'col1' } });
    expect(result).toBe(true);
  });

  it('returns false when collection does not exist', async () => {
    mockColFindUnique.mockResolvedValue(null);
    const result = await deleteCollection('col1', 'Darla#1');
    expect(mockColDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('returns false when requester is not the owner', async () => {
    mockColFindUnique.mockResolvedValue(COL);
    const result = await deleteCollection('col1', 'Other#99');
    expect(mockColDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe('addItemToCollection', () => {
  it('adds a review to a collection', async () => {
    mockItemCreate.mockResolvedValue(ITEM);

    const result = await addItemToCollection('col1', 'r1');

    expect(mockItemCreate).toHaveBeenCalledWith({
      data: { collectionId: 'col1', reviewId: 'r1' },
    });
    expect(result).toEqual(ITEM);
  });
});

describe('removeItemFromCollection', () => {
  it('removes a review from a collection', async () => {
    mockItemDelete.mockResolvedValue(ITEM);

    await removeItemFromCollection('col1', 'r1');

    expect(mockItemDelete).toHaveBeenCalledWith({
      where: { collectionId_reviewId: { collectionId: 'col1', reviewId: 'r1' } },
    });
  });
});

describe('getCollectionItems', () => {
  it('returns all review IDs in a collection', async () => {
    mockItemFindMany.mockResolvedValue([ITEM, { ...ITEM, id: 'item2', reviewId: 'r2' }]);

    const result = await getCollectionItems('col1');

    expect(mockItemFindMany).toHaveBeenCalledWith({
      where:   { collectionId: 'col1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual(['r1', 'r2']);
  });

  it('returns empty array when collection is empty', async () => {
    mockItemFindMany.mockResolvedValue([]);
    const result = await getCollectionItems('col1');
    expect(result).toEqual([]);
  });
});
