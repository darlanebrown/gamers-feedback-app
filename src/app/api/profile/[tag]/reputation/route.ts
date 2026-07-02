import { NextRequest, NextResponse } from 'next/server';
import { getUserByTag } from '@/lib/userStore';
import { getUserReputation } from '@/lib/reputationService';

type Params = { params: Promise<{ tag: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tag } = await params;
  const user = await getUserByTag(tag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const reputation = await getUserReputation(tag);
  return NextResponse.json({ gamerTag: tag, ...reputation });
}
