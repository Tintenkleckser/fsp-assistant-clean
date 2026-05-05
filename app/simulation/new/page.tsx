import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth-helpers';
import { prisma } from '@/lib/db';
import { NewSimulationForm } from './new-simulation-form';

export const dynamic = 'force-dynamic';

export default async function NewSimulationPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const [recentTemplates, profile] = await Promise.all([
    prisma.simulationTemplate.findMany({
      orderBy: { titleDe: 'asc' },
      take: 8
    }).catch(() => []),
    prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        targetRegionId: true,
        targetRegion: {
          select: {
            id: true,
            name: true,
            summary: true,
            verificationStatus: true,
            examParts: {
              orderBy: { sequenceOrder: 'asc' },
              select: {
                partKey: true,
                title: true,
                durationMinutes: true,
                sequenceOrder: true,
                languageFocus: true,
                requiredOutput: true,
                isCorePart: true,
                trainingImpact: true
              }
            },
            requirements: {
              orderBy: [{ severity: 'asc' }, { title: 'asc' }],
              select: {
                partKey: true,
                requirementType: true,
                title: true,
                trainingImpact: true,
                severity: true
              }
            }
          }
        }
      }
    })
  ]);

  return <NewSimulationForm recentTemplates={recentTemplates} region={profile?.targetRegion ?? null} />;
}
