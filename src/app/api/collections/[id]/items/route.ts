import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { addItemToCollection, removeItemFromCollection, getCollectionItems } from '@/lib/collectionStore';

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reviewIds = await getCollectionItems(params.id);
  return NextResponse.json({ reviewIds });
}

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reviewId } = await req.json();
  if (!reviewId || typeof reviewId !== 'string') {
    return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
  }

  try {
    await addItemToCollection(params.id, reviewId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Review already in this collection' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reviewId = searchParams.get('reviewId');
  if (!reviewId) return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });

  await removeItemFromCollection(params.id, reviewId);
  return NextResponse.json({ ok: true });
}
