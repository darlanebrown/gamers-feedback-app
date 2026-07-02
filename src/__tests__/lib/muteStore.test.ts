jest.mock('@/lib/prisma', () => ({
  prisma: {
    mute: {
      create:     jest.fn(),
      delete:     jest.fn(),
      findUnique: jest.fn(),
      findMany:   jest.fn(),
    },
  },
}));

import { addMute, removeMute, isMuted, getMutedTags } from '@/lib/muteStore';
import { prisma } from '@/lib/prisma';

const mockCreate     = (prisma.mute as any).create     as jest.Mock;
const mockDelete     = (prisma.mute as any).delete     as jest.Mock;
const mockFindUnique = (prisma.mute as any).findUnique as jest.Mock;
const mockFindMany   = (prisma.mute as any).findMany   as jest.Mock;

beforeEach(() => jest.resetAllMocks());

const MUTE = { id: 'm1', muterTag: 'Darla#1', mutedTag: 'Troll#99', createdAt: new Date() };

describe('addMute', () => {
  it('creates a mute record', async () => {
    mockCreate.mockResolvedValue(MUTE);

    const result = await addMute('Darla#1', 'Troll#99');

    expect(mockCreate).toHaveBeenCalledWith({
      data: { muterTag: 'Darla#1', mutedTag: 'Troll#99' },
    });
    expect(result).toEqual(MUTE);
  });
});

describe('removeMute', () => {
  it('deletes the mute record', async () => {
    mockDelete.mockResolvedValue(MUTE);

    await removeMute('Darla#1', 'Troll#99');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { muterTag_mutedTag: { muterTag: 'Darla#1', mutedTag: 'Troll#99' } },
    });
  });
});

describe('isMuted', () => {
  it('returns true when a mute record exists', async () => {
    mockFindUnique.mockResolvedValue(MUTE);

    const result = await isMuted('Darla#1', 'Troll#99');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { muterTag_mutedTag: { muterTag: 'Darla#1', mutedTag: 'Troll#99' } },
    });
    expect(result).toBe(true);
  });

  it('returns false when no mute record exists', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await isMuted('Darla#1', 'Troll#99');

    expect(result).toBe(false);
  });
});

describe('getMutedTags', () => {
  it('returns the list of muted gamer tags', async () => {
    mockFindMany.mockResolvedValue([
      { mutedTag: 'Troll#99' },
      { mutedTag: 'Spammer#1' },
    ]);

    const result = await getMutedTags('Darla#1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where:  { muterTag: 'Darla#1' },
      select: { mutedTag: true },
    });
    expect(result).toEqual(['Troll#99', 'Spammer#1']);
  });

  it('returns an empty array when the user has muted nobody', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getMutedTags('Darla#1');

    expect(result).toEqual([]);
  });
});
