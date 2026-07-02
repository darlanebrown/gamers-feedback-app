import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByTag, VALID_TAGS } from '@/lib/reviewTagStore';

type Params = { params: Promise<{ tag: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tag } = await params;
  if (!VALID_TAGS.includes(tag as any))
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
  const reviews = await getReviewsByTag(tag);
  return NextResponse.json({ reviews });
}
