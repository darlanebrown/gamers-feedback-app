import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFollowSuggestions } from '@/lib/followSuggestionsService';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

  const suggestions = await getFollowSuggestions(session.gamerTag, limit);
  return NextResponse.json({ suggestions });
}
