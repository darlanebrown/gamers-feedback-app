import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getAllReviews } from '@/lib/reviewStore';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');

  const all = await getAllReviews();
  const reviews = filter ? all.filter((r) => r.classification === filter) : all;

  return NextResponse.json({ reviews, total: reviews.length });
}
