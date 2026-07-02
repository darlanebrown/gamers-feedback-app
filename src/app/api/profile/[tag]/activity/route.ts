import { NextRequest, NextResponse } from 'next/server';
import { findUserByTag } from '@/lib/userStore';
import { getUserActivity } from '@/lib/activityService';

export async function GET(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const user = await findUserByTag(params.tag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  const activities = await getUserActivity(params.tag, limit);
  return NextResponse.json({ activities });
}
