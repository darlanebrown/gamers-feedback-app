import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteCommentAsAdmin } from '@/lib/commentStore';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const deleted = await deleteCommentAsAdmin(params.id);
  if (!deleted) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
