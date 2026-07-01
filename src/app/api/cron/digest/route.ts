import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/userStore';
import { getUserDigestData, hasActivity } from '@/lib/digestService';
import { sendDigestEmail } from '@/lib/emailService';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getAllUsers();
  let sent = 0;
  let skipped = 0;

  await Promise.all(
    users
      .filter((u) => !u.banned)
      .map(async (u) => {
        const data = await getUserDigestData(u.gamerTag);
        if (!hasActivity(data)) { skipped++; return; }
        await sendDigestEmail(u.email, u.gamerTag, data).catch(() => {});
        sent++;
      }),
  );

  return NextResponse.json({ ok: true, sent, skipped });
}
