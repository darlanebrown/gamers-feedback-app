import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getUserById, updateUserById } from '@/lib/userStore';

const VALID_ACTIONS = new Set(['ban', 'unban', 'promote']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { action } = await req.json();

  if (!action || !VALID_ACTIONS.has(action))
    return NextResponse.json(
      { error: `action must be one of: ${Array.from(VALID_ACTIONS).join(', ')}` },
      { status: 400 },
    );

  const user = await getUserById(params.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const update =
    action === 'ban'     ? { banned: true  } :
    action === 'unban'   ? { banned: false } :
                           { role: 'admin' };

  const updated = await updateUserById(params.id, update);
  return NextResponse.json({ ok: true, user: updated });
}
