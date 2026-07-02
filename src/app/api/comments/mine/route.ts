import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCommentsByTag } from '@/lib/commentStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10));
  const skip  = (page - 1) * limit;

  const comments = await getCommentsByTag(session.gamerTag, { skip, take: limit });
  return NextResponse.json({ comments });
}
