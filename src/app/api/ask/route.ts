import { NextRequest, NextResponse } from 'next/server';
import { askQuestion } from '@/lib/askService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });

  try {
    const result = await askQuestion(q);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Ask failed' }, { status: 500 });
  }
}
