import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getRecentNegativeReviewCounts } from '@/lib/reviewStore';

const BOMB_THRESHOLD  = parseInt(process.env.BOMB_THRESHOLD  ?? '10', 10);
const BOMB_WINDOW_HRS = parseInt(process.env.BOMB_WINDOW_HRS ?? '2',  10);

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const counts = await getRecentNegativeReviewCounts(BOMB_WINDOW_HRS);

  const alerts = counts
    .map((c) => ({ gameTitle: c.gameTitle, negativeCount: c.count, isBombing: c.count >= BOMB_THRESHOLD }))
    .filter((a) => a.isBombing);

  return NextResponse.json({ alerts, windowHours: BOMB_WINDOW_HRS, threshold: BOMB_THRESHOLD });
}
