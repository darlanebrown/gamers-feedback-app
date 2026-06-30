// src/lib/reviewStore.ts
// In-memory store — swap for PostgreSQL when ready

import { Review, ReviewClassification } from '@/types';

let reviews: Review[] = [
  {
    id: 'r001',
    gameTitle: 'Elden Ring',
    platform: 'PC',
    rating: 10,
    headline: 'The benchmark every open world game will be judged by',
    body: 'FromSoftware somehow outdid themselves. The Lands Between is a world that rewards genuine curiosity — every fog gate, every illusory wall, every item description adds to a mythology that feels earned rather than constructed. The difficulty is not punishment, it is the language the game speaks.',
    pros: 'World design, boss variety, build depth, replayability',
    cons: 'Performance issues on PC at launch, some late-game bosses feel unfair',
    playtime: '240 hours',
    reviewerTag: 'TarnishedVet#8821',
    classification: 'helpful',
    createdAt: '2024-11-15T14:22:00Z',
  },
  {
    id: 'r002',
    gameTitle: 'Baldur\'s Gate 3',
    platform: 'PC',
    rating: 10,
    headline: 'This is what RPGs have always promised and never delivered',
    body: 'Every choice matters. I said that about other RPGs and was wrong. In BG3, I said something offhand in Act 1 and it changed my Act 3 ending. The writing respects player intelligence and the combat system has enough depth that 200 hours in I\'m still finding interactions I missed.',
    pros: 'Writing, reactivity, combat depth, co-op implementation',
    cons: 'Act 3 performance, some bugs still present post-launch',
    playtime: '320 hours',
    reviewerTag: 'DiceRollDuke#4412',
    classification: 'helpful',
    createdAt: '2024-10-28T09:15:00Z',
  },
  {
    id: 'r003',
    gameTitle: 'Call of Duty: Modern Warfare III',
    platform: 'PlayStation 5',
    rating: 4,
    headline: 'A $70 expansion pass dressed as a full game',
    body: 'Six hour campaign that feels like tutorial levels with cinematic cutscenes. Multiplayer maps are recycled from MW2019. The Zombies mode had potential but feels unfinished. Warzone integration is the only thing keeping this from a 2.',
    pros: 'Gunplay still feels good, Warzone crossover content',
    cons: 'Short campaign, recycled maps, $70 price point is unjustifiable',
    playtime: '45 hours',
    reviewerTag: 'WarzoneDrop#7733',
    classification: 'helpful',
    createdAt: '2024-12-01T18:40:00Z',
  },
  {
    id: 'r004',
    gameTitle: 'Hollow Knight: Silksong',
    platform: 'Nintendo Switch',
    rating: 1,
    headline: 'BUY THIS GAME USE CODE GAMER20 FOR DISCOUNT!!!',
    body: 'Amazing game click my profile link for discount codes and free V-bucks generator no survey needed 2024 working method subscribe to my channel',
    pros: 'free stuff',
    cons: 'none',
    playtime: '0 hours',
    reviewerTag: 'FreeVbucks2024#0001',
    classification: 'spam',
    classificationReason: 'Promotional content with external links and discount codes',
    createdAt: '2024-12-03T02:11:00Z',
  },
  {
    id: 'r005',
    gameTitle: 'The Legend of Zelda: Tears of the Kingdom',
    platform: 'Nintendo Switch',
    rating: 9,
    headline: 'Ultrahand is the most creative mechanic in years',
    body: 'Nintendo gave us physics and said "figure it out." The Zonai devices and Ultrahand system create emergent gameplay that no designer could script. I spent 3 hours building a flying machine before touching the first dungeon and did not feel like I was wasting time.',
    pros: 'Ultrahand creativity, dungeon design improvement over BotW, sky islands',
    cons: 'Reuses Hyrule map, story delivery still awkward, framerate dips',
    playtime: '180 hours',
    reviewerTag: 'HylianEngineer#5509',
    classification: 'helpful',
    createdAt: '2024-09-20T12:00:00Z',
  },
];

let idCounter = 100;

export function getAllReviews(): Review[] {
  return [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getHelpfulReviews(): Review[] {
  return getAllReviews().filter((r) => r.classification === 'helpful');
}

export function getReviewsByGame(title: string): Review[] {
  return getAllReviews().filter(
    (r) =>
      r.gameTitle.toLowerCase().includes(title.toLowerCase()) &&
      r.classification === 'helpful'
  );
}

export function getUniqueGameTitles(): string[] {
  const helpful = getHelpfulReviews();
  return [...new Set(helpful.map((r) => r.gameTitle))].sort();
}

export function addReview(review: Omit<Review, 'id' | 'createdAt' | 'classification'>): Review {
  const newReview: Review = {
    ...review,
    id: `r${++idCounter}`,
    createdAt: new Date().toISOString(),
    classification: 'pending',
  };
  reviews = [newReview, ...reviews];
  return newReview;
}

export function updateReviewClassification(
  id: string,
  classification: ReviewClassification,
  reason?: string
): void {
  reviews = reviews.map((r) =>
    r.id === id ? { ...r, classification, classificationReason: reason } : r
  );
}

export function getStats() {
  const all = getAllReviews();
  const helpful = all.filter((r) => r.classification === 'helpful');
  const spam = all.filter((r) => r.classification === 'spam');
  const toxic = all.filter((r) => r.classification === 'toxic');
  const avgRating =
    helpful.length > 0
      ? (helpful.reduce((sum, r) => sum + r.rating, 0) / helpful.length).toFixed(1)
      : '0';

  return {
    total: all.length,
    helpful: helpful.length,
    spam: spam.length,
    toxic: toxic.length,
    avgRating,
    uniqueGames: getUniqueGameTitles().length,
  };
}
