import { NextResponse } from 'next/server';
import { getTrendingTags } from '@/lib/reviewTagStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tags = await getTrendingTags();
  return NextResponse.json({ tags });
}
