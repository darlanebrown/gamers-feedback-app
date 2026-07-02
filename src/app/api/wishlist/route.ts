import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/wishlistStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const wishlist = await getWishlist(session.id);
  return NextResponse.json({ wishlist });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { gameTitle } = await req.json();
  if (!gameTitle || typeof gameTitle !== 'string') {
    return NextResponse.json({ error: 'gameTitle is required' }, { status: 400 });
  }

  try {
    const item = await addToWishlist(session.id, gameTitle);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Game already in wishlist' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { gameTitle } = await req.json();
  if (!gameTitle || typeof gameTitle !== 'string') {
    return NextResponse.json({ error: 'gameTitle is required' }, { status: 400 });
  }

  const removed = await removeFromWishlist(session.id, gameTitle);
  if (!removed) return NextResponse.json({ error: 'Game not in wishlist' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
