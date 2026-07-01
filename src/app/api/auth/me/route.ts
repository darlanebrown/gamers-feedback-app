import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { getUserById, updateProfile, anonymizeUser } from '@/lib/userStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ user: session });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { displayName, bio, currentPassword, newPassword } = body as {
    displayName?: string;
    bio?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  if (newPassword !== undefined) {
    if (!currentPassword)
      return NextResponse.json({ error: 'currentPassword is required to change password' }, { status: 400 });
    if (newPassword.length < 8)
      return NextResponse.json({ error: 'newPassword must be at least 8 characters' }, { status: 400 });

    const user = await getUserById(session.id);
    if (!user)
      return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updated = await updateProfile(session.id, { passwordHash });
    return NextResponse.json({ user: updated });
  }

  const data: { displayName?: string; bio?: string } = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (bio !== undefined) data.bio = bio;

  const updated = await updateProfile(session.id, data);
  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await anonymizeUser(session.id);
  return NextResponse.json({ ok: true });
}
