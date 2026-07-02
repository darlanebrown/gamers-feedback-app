import { NextResponse } from 'next/server';
import { getTrendingTags } from '@/lib/reviewTagStore';

export async function GET() {
  const tags = await getTrendingTags();
  return NextResponse.json({ tags });
}
