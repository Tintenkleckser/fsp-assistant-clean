import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templates = await prisma.simulationTemplate.findMany({
      orderBy: { titleDe: 'asc' },
      take: 50
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json({ error: 'Templates konnten nicht geladen werden.' }, { status: 500 });
  }
}
