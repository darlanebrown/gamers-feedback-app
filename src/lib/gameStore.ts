import { prisma } from './prisma';

export interface GameSummary {
  title:       string;
  coverUrl:    string | null;
  genres:      string | null;
  metacritic:  number | null;
  releaseDate: string | null;
  developer:   string | null;
}

export async function getGamesByTitles(titles: string[]): Promise<GameSummary[]> {
  if (titles.length === 0) return [];
  const rows = await prisma.game.findMany({
    where:   { title: { in: titles } },
    select:  { title: true, coverUrl: true, genres: true, metacritic: true, releaseDate: true, developer: true },
  }) as GameSummary[];
  const map = new Map<string, GameSummary>(rows.map((r) => [r.title, r]));
  return titles.map((t) => map.get(t) ?? { title: t, coverUrl: null, genres: null, metacritic: null, releaseDate: null, developer: null });
}
