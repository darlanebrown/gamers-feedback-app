import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { upsertVote, removeVote, getVoteCounts, getUserVote, VoteType } from '@/lib/voteStore';
import { getReviewById } from '@/lib/reviewStore';
import { createNotification } from '@/lib/notificationStore';
import { findUserByTag } from '@/lib/userStore';
import { sendVoteEmail } from '@/lib/emailService';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req);
  const votes = await getVoteCounts(params.id);
  const userVote = session ? await getUserVote(params.id, session.gamerTag) : null;
  return NextResponse.json({ votes, userVote });
}

const VALID_TYPES = new Set<VoteType>(['up', 'down']);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const { type } = await req.json();
  if (!type || !VALID_TYPES.has(type as VoteType))
    return NextResponse.json({ error: 'type must be "up" or "down"' }, { status: 400 });

  await upsertVote(params.id, session.gamerTag, type as VoteType);
  const votes = await getVoteCounts(params.id);
  // notify the review author (skip if they voted on their own review)
  if (review.reviewerTag !== session.gamerTag) {
    createNotification(
      review.reviewerTag,
      type === 'up' ? 'vote_up' : 'vote_down',
      session.gamerTag,
      params.id,
      review.gameTitle,
    ).catch(() => {});
    findUserByTag(review.reviewerTag)
      .then((author) => {
        if (author) sendVoteEmail(author.email, session.gamerTag, review.gameTitle, type as 'up' | 'down').catch(() => {});
      })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true, votes });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await removeVote(params.id, session.gamerTag);
  const votes = await getVoteCounts(params.id);
  return NextResponse.json({ ok: true, votes });
}
