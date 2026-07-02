import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { updateUserById } from '@/lib/userStore';
import { findValidReset, markResetUsed } from '@/lib/passwordResetStore';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const reset = await findValidReset(token);
  if (!reset) {
    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await updateUserById(reset.userId, { passwordHash });
  await markResetUsed(reset.id);

  return NextResponse.json({ ok: true });
}
