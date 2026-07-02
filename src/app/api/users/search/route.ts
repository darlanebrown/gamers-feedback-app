import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/userStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
  const raw = await searchUsers(q, limit);
  const users = raw.map(({ passwordHash: _, ...pub }: any) => pub);
  return NextResponse.json({ users });
}
