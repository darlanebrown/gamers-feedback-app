import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/userStore';
import { signToken, setSessionCookie } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/securityLogger';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password)
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user) {
      logSecurityEvent('login_failed', email, undefined, 'email not found');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logSecurityEvent('login_failed', email, user.id, 'wrong password');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.banned) {
      logSecurityEvent('login_banned', user.gamerTag, user.id);
      return NextResponse.json({ error: 'Your account has been banned' }, { status: 403 });
    }

    const token = await signToken({ id: user.id, email: user.email, gamerTag: user.gamerTag, role: user.role });

    const res = NextResponse.json({ user: { id: user.id, email: user.email, gamerTag: user.gamerTag, role: user.role } });
    setSessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
