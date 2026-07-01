import { NextRequest, NextResponse } from 'next/server';
import { getReviewById } from '@/lib/reviewStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ review });
}
