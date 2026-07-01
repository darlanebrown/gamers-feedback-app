import { NextRequest, NextResponse } from 'next/server';
import { getReviewById } from '@/lib/reviewStore';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [upvotes, downvotes, commentCount, bookmarkCount, flagCount] = await Promise.all([
    prisma.reviewVote.count({ where: { reviewId: params.id, type: 'up' } }),
    prisma.reviewVote.count({ where: { reviewId: params.id, type: 'down' } }),
    prisma.reviewComment.count({ where: { reviewId: params.id } }),
    prisma.reviewBookmark.count({ where: { reviewId: params.id } }),
    prisma.reviewFlag.count({ where: { reviewId: params.id } }),
  ]);

  return NextResponse.json({ upvotes, downvotes, commentCount, bookmarkCount, flagCount });
}
