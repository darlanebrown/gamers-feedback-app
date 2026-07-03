// src/app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { getStats } from '@/lib/reviewStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats);
}
