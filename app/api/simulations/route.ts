import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json([], { status: 401 });
  }

  const simulations = await prisma.userSimulation.findMany({
    where: { userId: user.id },
    include: {
      template: { select: { titleDe: true, titleTr: true, type: true } },
      _count: { select: { interactions: true } }
    },
    orderBy: { startedAt: 'desc' }
  });

  return NextResponse.json(simulations);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const templateId = String(body?.templateId ?? '');

  if (!templateId) {
    return NextResponse.json({ error: 'templateId required' }, { status: 400 });
  }

  const template = await prisma.simulationTemplate.findUnique({
    where: { id: templateId }
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const simulation = await prisma.userSimulation.create({
    data: {
      userId: user.id,
      templateId,
      languageMode: String(body?.languageMode ?? 'german_only'),
      status: 'in_progress'
    }
  });

  return NextResponse.json(simulation);
}
