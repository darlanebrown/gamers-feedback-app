import { NextRequest, NextResponse } from 'next/server';
import { getReviewById } from '@/lib/reviewStore';
import { getRevisionHistory } from '@/lib/revisionStore';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const revisions = await getRevisionHistory(id);
  return NextResponse.json({ revisions });
}
