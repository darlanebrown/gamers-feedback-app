import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewsByTag } from '@/lib/reviewStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reviews = await getReviewsByTag(session.gamerTag);
  return NextResponse.json({ reviews, total: reviews.length });
}
