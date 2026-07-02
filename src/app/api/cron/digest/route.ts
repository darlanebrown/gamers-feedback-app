import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyDigest } from '@/lib/digestService';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sent, skipped } = await runWeeklyDigest();
  return NextResponse.json({ ok: true, sent, skipped });
}
