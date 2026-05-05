import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const targetRegionId = body?.targetRegionId === null ? null : String(body?.targetRegionId ?? '').trim();

    if (targetRegionId) {
      const region = await prisma.fspRegion.findUnique({
        where: { id: targetRegionId },
        select: { id: true }
      });

      if (!region) {
        return NextResponse.json({ error: 'Bundesland wurde nicht gefunden.' }, { status: 400 });
      }
    }

    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: { targetRegionId: targetRegionId || null },
      select: {
        id: true,
        targetRegionId: true
      }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile preferences update error:', error);
    return NextResponse.json({ error: 'Profileinstellungen konnten nicht gespeichert werden.' }, { status: 500 });
  }
}
