import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createCollection, getCollections, deleteCollection } from '@/lib/collectionStore';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const collections = await getCollections(session.gamerTag);
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const collection = await createCollection(session.gamerTag, name.trim());
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A collection with that name already exists' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const deleted = await deleteCollection(id, session.gamerTag);
  if (!deleted) return NextResponse.json({ error: 'Not found or not your collection' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
