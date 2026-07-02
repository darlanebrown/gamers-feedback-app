import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/userStore';
import { createPasswordReset } from '@/lib/passwordResetStore';
import { sendPasswordResetEmail } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const user = await findUserByEmail(email);

  if (user) {
    const reset = await createPasswordReset(user.id);
    sendPasswordResetEmail(user.email, reset.token).catch(() => {});
  }

  // Always return 200 to prevent email enumeration
  return NextResponse.json({ ok: true });
}
