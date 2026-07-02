import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  upsertCommentVote,
  removeCommentVote,
  getCommentVoteCounts,
  getUserCommentVote,
  VoteType,
} from '@/lib/commentVoteStore';

type Ctx = { params: { id: string; commentId: string } };

export async function GET(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const session = await getSession(req);
  const [counts, userVote] = await Promise.all([
    getCommentVoteCounts(params.commentId),
    session ? getUserCommentVote(params.commentId, session.gamerTag) : Promise.resolve(null),
  ]);
  return NextResponse.json({ ...counts, userVote });
}

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await req.json();
  if (type !== 'up' && type !== 'down') {
    return NextResponse.json({ error: 'type must be "up" or "down"' }, { status: 400 });
  }

  await upsertCommentVote(params.commentId, session.gamerTag, type as VoteType);
  const counts = await getCommentVoteCounts(params.commentId);
  return NextResponse.json({ ...counts, userVote: type });
}

export async function DELETE(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await removeCommentVote(params.commentId, session.gamerTag);
  const counts = await getCommentVoteCounts(params.commentId);
  return NextResponse.json({ ...counts, userVote: null });
}
