jest.mock('@/lib/auth',          () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore',     () => ({ getUserByTag: jest.fn() }));
jest.mock('@/lib/gameFollowStore', () => ({ getFollowedGames: jest.fn() }));
jest.mock('@/lib/gameStore',     () => ({ getGamesByTitles: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/me/games/route';
import { getSession }        from '@/lib/auth';
import { getUserByTag }      from '@/lib/userStore';
import { getFollowedGames }  from '@/lib/gameFollowStore';
import { getGamesByTitles }  from '@/lib/gameStore';

const mockSession  = getSession       as jest.Mock;
const mockGetUser  = getUserByTag     as jest.Mock;
const mockGetGames = getFollowedGames as jest.Mock;
const mockDetails  = getGamesByTitles as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', role: 'user' };
const USER    = { id: 'u1', gamerTag: 'Darla#1' };

const FOLLOWED_TITLES = ['Elden Ring', 'Hades', 'Celeste'];
const GAME_DETAILS = [
  { title: 'Elden Ring', coverUrl: 'https://img/er.jpg', genres: 'RPG',   metacritic: 96 },
  { title: 'Hades',      coverUrl: 'https://img/h.jpg',  genres: 'Action',metacritic: 93 },
  { title: 'Celeste',    coverUrl: 'https://img/c.jpg',  genres: 'Indie', metacritic: 92 },
];

function makeReq() {
  return new NextRequest('http://localhost/api/users/me/games');
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockGetUser.mockResolvedValue(USER);
  mockGetGames.mockResolvedValue(FOLLOWED_TITLES);
  mockDetails.mockResolvedValue(GAME_DETAILS);
});

describe('GET /api/users/me/games', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns followed games with details', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toHaveLength(3);
    expect(body.total).toBe(3);
  });

  it('returns game details for each followed title', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.games[0]).toMatchObject({
      title:      'Elden Ring',
      coverUrl:   'https://img/er.jpg',
      genres:     'RPG',
      metacritic: 96,
    });
  });

  it('calls getGamesByTitles with followed titles', async () => {
    await GET(makeReq());
    expect(mockDetails).toHaveBeenCalledWith(FOLLOWED_TITLES);
  });

  it('returns empty list when user follows no games', async () => {
    mockGetGames.mockResolvedValue([]);
    mockDetails.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.games).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('skips getGamesByTitles call when no games followed', async () => {
    mockGetGames.mockResolvedValue([]);
    await GET(makeReq());
    expect(mockDetails).not.toHaveBeenCalled();
  });
});
