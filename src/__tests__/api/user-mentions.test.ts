jest.mock('@/lib/userStore',        () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/notificationStore', () => ({ createNotification: jest.fn() }));

import { extractMentions, notifyMentions } from '@/lib/mentionService';
import { findUserByTag }       from '@/lib/userStore';
import { createNotification }  from '@/lib/notificationStore';

const mockFindUser  = findUserByTag      as jest.Mock;
const mockNotify    = createNotification as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockFindUser.mockResolvedValue(null);
  mockNotify.mockResolvedValue(undefined);
});

describe('extractMentions', () => {
  it('extracts a single mention', () => {
    expect(extractMentions('Nice review @Bob#2!')).toEqual(['Bob#2']);
  });

  it('extracts multiple mentions', () => {
    expect(extractMentions('cc @Alice#1 and @Bob#2')).toEqual(['Alice#1', 'Bob#2']);
  });

  it('deduplicates repeated mentions', () => {
    expect(extractMentions('@Bob#2 @Bob#2 agree?')).toEqual(['Bob#2']);
  });

  it('returns empty array when no mentions', () => {
    expect(extractMentions('Great review!')).toEqual([]);
  });

  it('handles mention at start of string', () => {
    expect(extractMentions('@Darla#1 nice')).toEqual(['Darla#1']);
  });
});

describe('notifyMentions', () => {
  it('creates a notification for each valid mentioned user', async () => {
    mockFindUser.mockResolvedValue({ gamerTag: 'Bob#2' });
    await notifyMentions('hey @Bob#2', 'r1', 'Darla#1');
    expect(mockNotify).toHaveBeenCalledWith('Bob#2', 'mention', 'Darla#1', 'r1');
  });

  it('skips self-mentions', async () => {
    await notifyMentions('I said @Darla#1 did it', 'r1', 'Darla#1');
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('skips mentions of non-existent users', async () => {
    mockFindUser.mockResolvedValue(null);
    await notifyMentions('hey @Ghost#9', 'r1', 'Darla#1');
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('notifies multiple valid mentioned users', async () => {
    mockFindUser
      .mockResolvedValueOnce({ gamerTag: 'Alice#1' })
      .mockResolvedValueOnce({ gamerTag: 'Bob#2' });
    await notifyMentions('@Alice#1 and @Bob#2 check this', 'r1', 'Darla#1');
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  it('does not notify when body has no mentions', async () => {
    await notifyMentions('Great game!', 'r1', 'Darla#1');
    expect(mockFindUser).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
