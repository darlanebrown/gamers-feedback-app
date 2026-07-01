import { prisma } from './prisma';

export type Alert = {
  id: string;
  type: string;
  gameTitle: string;
  count: number;
  detectedAt: Date;
  dismissed: boolean;
  dismissedAt: Date | null;
};

const BOMBING_THRESHOLD = 5;
const BOMBING_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkForBombing(gameTitle: string): Promise<void> {
  const since = new Date(Date.now() - BOMBING_WINDOW_MS);

  const lowRated = await prisma.review.count({
    where: { gameTitle, rating: { lte: 3 }, createdAt: { gte: since } },
  });

  if (lowRated < BOMBING_THRESHOLD) return;

  // Don't create a duplicate alert if one is already open for this game
  const existing = await prisma.alert.findFirst({
    where: { type: 'review_bombing', gameTitle, dismissed: false },
  });
  if (existing) return;

  await prisma.alert.create({
    data: { type: 'review_bombing', gameTitle, count: lowRated },
  });
}

export async function getActiveAlerts(): Promise<Alert[]> {
  return prisma.alert.findMany({
    where: { dismissed: false },
    orderBy: { detectedAt: 'desc' },
  }) as Promise<Alert[]>;
}

export async function dismissAlert(id: string): Promise<Alert> {
  return prisma.alert.update({
    where: { id },
    data: { dismissed: true, dismissedAt: new Date() },
  }) as Promise<Alert>;
}
