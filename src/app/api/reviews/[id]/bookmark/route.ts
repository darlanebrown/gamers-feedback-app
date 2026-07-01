import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarkStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookmarked = await isBookmarked(params.id, session.gamerTag);
  return NextResponse.json({ bookmarked });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await addBookmark(params.id, session.gamerTag);
    return NextResponse.json({ bookmarked: true });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Already bookmarked' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await removeBookmark(params.id, session.gamerTag);
  return NextResponse.json({ bookmarked: false });
}
