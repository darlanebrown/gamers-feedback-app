import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/recommendationsService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reviewerTag = searchParams.get('reviewerTag')?.trim();
  if (!reviewerTag) {
    return NextResponse.json({ error: 'reviewerTag is required' }, { status: 400 });
  }
  try {
    const recommendations = await getRecommendations(reviewerTag, 6);
    return NextResponse.json({ recommendations });
  } catch {
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 });
  }
}
