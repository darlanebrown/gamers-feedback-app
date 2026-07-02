import { NextResponse } from 'next/server';
import { getFeaturedReview } from '@/lib/featuredReviewStore';

export async function GET() {
  const review = await getFeaturedReview();
  if (!review) return NextResponse.json({ error: 'No featured review' }, { status: 404 });
  return NextResponse.json({ review });
}
