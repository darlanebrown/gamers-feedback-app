import { prisma } from './prisma';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type GameMeta = {
  slug:        string;
  title:       string;
  coverUrl:    string | null;
  genres:      string | null;
  releaseDate: string | null;
  developer:   string | null;
  metacritic:  number | null;
  description: string | null;
  fetchedAt:   Date;
};

export async function getOrFetchGame(title: string): Promise<GameMeta | null> {
  const cached = await prisma.game.findFirst({
    where: { title: { equals: title, mode: 'insensitive' } },
  });

  const isStale = !cached || Date.now() - cached.fetchedAt.getTime() > CACHE_TTL_MS;
  if (!isStale) return cached as GameMeta;

  const fresh = await fetchFromRAWG(title);
  if (!fresh) return (cached as GameMeta | null);

  return (await prisma.game.upsert({
    where:  { slug: fresh.slug },
    create: { ...fresh, fetchedAt: new Date() },
    update: { ...fresh, fetchedAt: new Date() },
  })) as GameMeta;
}

async function fetchFromRAWG(title: string): Promise<Omit<GameMeta, 'fetchedAt'> | null> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return null;

  const searchRes = await fetch(
    `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(title)}&page_size=1`,
  );
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const hit = searchData.results?.[0];
  if (!hit) return null;

  const detailRes = await fetch(`https://api.rawg.io/api/games/${hit.slug}?key=${key}`);
  const detail = detailRes.ok ? await detailRes.json() : hit;

  return {
    slug:        hit.slug,
    title:       detail.name ?? title,
    coverUrl:    detail.background_image ?? null,
    genres:      (detail.genres ?? []).map((g: { name: string }) => g.name).join(', ') || null,
    releaseDate: detail.released ?? null,
    developer:   (detail.developers ?? [])[0]?.name ?? null,
    metacritic:  detail.metacritic ?? null,
    description: detail.description_raw
      ? String(detail.description_raw).slice(0, 500)
      : null,
  };
}
