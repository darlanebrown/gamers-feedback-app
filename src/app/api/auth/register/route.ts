import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, findUserByTag } from '@/lib/userStore';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, gamerTag } = await req.json();

    if (!email || !password || !gamerTag)
      return NextResponse.json({ error: 'email, password and gamerTag are required' }, { status: 400 });
    if (typeof password !== 'string' || password.length < 8)
      return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
    if (typeof gamerTag !== 'string' || gamerTag.length < 2 || gamerTag.length > 50)
      return NextResponse.json({ error: 'gamerTag must be 2–50 characters' }, { status: 400 });

    if (await findUserByEmail(email))
      return NextResponse.json({ error: 'That email is already registered' }, { status: 409 });
    if (await findUserByTag(gamerTag))
      return NextResponse.json({ error: 'That gamer tag is already taken' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(email, passwordHash, gamerTag);
    const token = await signToken({ id: user.id, email: user.email, gamerTag: user.gamerTag });

    const res = NextResponse.json(
      { user: { id: user.id, email: user.email, gamerTag: user.gamerTag } },
      { status: 201 },
    );
    setSessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
